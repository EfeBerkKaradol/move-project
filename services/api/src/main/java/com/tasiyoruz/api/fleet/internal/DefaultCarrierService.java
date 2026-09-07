package com.tasiyoruz.api.fleet.internal;

import static com.tasiyoruz.api.fleet.internal.FleetExceptions.*;

import com.tasiyoruz.api.catalog.api.FleetService;
import com.tasiyoruz.api.fleet.api.*;
import com.tasiyoruz.api.fleet.api.FleetEvents.CarrierApproved;
import com.tasiyoruz.api.fleet.api.FleetEvents.CarrierSuspended;
import com.tasiyoruz.api.fleet.domain.CarrierDocument;
import com.tasiyoruz.api.fleet.domain.CarrierProfile;
import com.tasiyoruz.api.fleet.domain.DomainAccess;
import com.tasiyoruz.api.shared.storage.ObjectStorage;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Taşıyıcı başvurusu ve belge doğrulama.
 *
 * <p>Zorunlu belge listesi araç tipine göre değişiyor ve tek kaynaktan
 * ({@link DocumentKind#requiredFor}) hesaplanıyor; arayüz kendi kopyasını tutmuyor.
 */
@Service
@Transactional
class DefaultCarrierService implements CarrierService, CarrierDirectory {

    private static final Logger log = LoggerFactory.getLogger(DefaultCarrierService.class);
    private static final ZoneId TR = ZoneId.of("Europe/Istanbul");

    private final CarrierProfileRepository profiles;
    private final CarrierDocumentRepository documents;
    private final ObjectStorage storage;
    private final FleetService fleet;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    DefaultCarrierService(CarrierProfileRepository profiles, CarrierDocumentRepository documents,
                          ObjectStorage storage, FleetService fleet, ApplicationEventPublisher events,
                          Clock clock) {
        this.profiles = profiles;
        this.documents = documents;
        this.storage = storage;
        this.fleet = fleet;
        this.events = events;
        this.clock = clock;
    }

    @Override
    public CarrierProfileView apply(String carrierId, CarrierApplicationRequest r) {
        if (fleet.capacityRank(r.vehicleTypeCode()).isEmpty()) {
            throw badRequest("Araç tipi tanınmadı.");
        }
        var now = Instant.now(clock);
        var profile = profiles.findByCarrierId(carrierId).orElse(null);
        if (profile == null) {
            profile = profiles.save(CarrierProfile.open(carrierId, r.displayName(), r.phone(),
                    r.companyName(), r.taxId(), r.vehicleTypeCode(), r.plate(), now));
            return view(profile);
        }
        if (profile.getStatus() == CarrierStatus.PENDING_REVIEW) {
            throw conflict("Başvurunuz incelemede; sonuçlanmadan değiştirilemez.");
        }
        DomainAccess.apply(profile, r.displayName(), r.phone(), r.companyName(), r.taxId(),
                r.vehicleTypeCode(), r.plate());
        // Araç tipi değişince zorunlu belge listesi de değişir; onay yeniden alınmalı
        DomainAccess.backToDraft(profile);
        return view(profile);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CarrierProfileView> profileOf(String carrierId) {
        return profiles.findByCarrierId(carrierId).map(this::view);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canTakeWork(String carrierId) {
        return profiles.findByCarrierId(carrierId)
                .map(p -> p.getStatus() == CarrierStatus.APPROVED)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public long approvedCarrierCount() {
        return profiles.countByStatus(CarrierStatus.APPROVED);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CarrierSummary> summary(String carrierId) {
        return profiles.findByCarrierId(carrierId).map(p -> new CarrierSummary(
                p.getCarrierId(), p.getDisplayName(), p.getCompanyName(),
                p.getVehicleTypeCode(), p.getPlate(), p.getStatus()));
    }

    @Override
    public CarrierProfileView uploadDocument(String carrierId, DocumentKind kind, LocalDate expiresOn,
                                             UploadedFile file) {
        var profile = mine(carrierId);
        if (profile.getStatus() == CarrierStatus.PENDING_REVIEW) {
            throw conflict("Başvurunuz incelemede; sonuçlanmadan belge değiştirilemez.");
        }
        if (expiresOn != null && expiresOn.isBefore(LocalDate.now(clock.withZone(TR)))) {
            throw badRequest("Belgenin son kullanma tarihi geçmiş.");
        }
        DocumentUploadPolicy.validate(file.contentType(), file.size());

        var now = Instant.now(clock);
        var key = DocumentUploadPolicy.storageKey(carrierId, kind);
        storage.put(key, file.contentType(), file.size(), file.content());

        var existing = profile.getDocuments().stream().filter(d -> d.getKind() == kind).findFirst();
        if (existing.isPresent()) {
            // Yeni dosya yazıldıktan sonra eskisini sil: sırayı ters kursaydık, yükleme
            // yarıda kalınca taşıyıcı hem eski hem yeni belgesiz kalırdı
            var old = existing.get().getStorageKey();
            DomainAccess.replaceFile(existing.get(), key, file.contentType(), file.size(),
                    file.originalFilename(), expiresOn, now);
            deleteQuietly(old);
        } else {
            DomainAccess.addDocument(profile, CarrierDocument.uploaded(kind, key, file.contentType(),
                    file.size(), file.originalFilename(), expiresOn, now));
        }
        DomainAccess.backToDraft(profile);
        // Görünüm belge kimliklerini taşıyor; kimlik ancak yazma sırasında atanıyor.
        // Flush olmadan yeni belge kimliksiz döner ve arayüz onu silemez/inceleyemez.
        return view(profiles.saveAndFlush(profile));
    }

    @Override
    public CarrierProfileView deleteDocument(String carrierId, String documentId) {
        var profile = mine(carrierId);
        if (profile.getStatus() == CarrierStatus.PENDING_REVIEW) {
            throw conflict("Başvurunuz incelemede; sonuçlanmadan belge silinemez.");
        }
        var document = ownedDocument(profile, documentId);
        DomainAccess.removeDocument(profile, document);
        DomainAccess.backToDraft(profile);
        deleteQuietly(document.getStorageKey());
        return view(profile);
    }

    @Override
    public CarrierProfileView submitForReview(String carrierId) {
        var profile = mine(carrierId);
        if (profile.getStatus() == CarrierStatus.PENDING_REVIEW) {
            throw conflict("Başvurunuz zaten incelemede.");
        }
        if (profile.getStatus() == CarrierStatus.APPROVED) {
            throw conflict("Başvurunuz zaten onaylı.");
        }
        var missing = missing(profile);
        if (!missing.isEmpty()) {
            throw badRequest("Eksik belge: " + missing.stream().map(DocumentKind::displayName)
                    .reduce((a, b) -> a + ", " + b).orElse(""));
        }
        DomainAccess.submit(profile, Instant.now(clock));
        return view(profile);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentDownload download(String requesterId, boolean operationsRole, String documentId) {
        var document = documents.findById(uuid(documentId).orElseThrow(() -> notFound("Belge")))
                .orElseThrow(() -> notFound("Belge"));
        if (!operationsRole && !document.getProfile().getCarrierId().equals(requesterId)) {
            throw forbidden();
        }
        var object = storage.get(document.getStorageKey())
                .orElseThrow(() -> notFound("Belge dosyası"));
        return new DocumentDownload(object.content(), object.contentType(), object.size(),
                DocumentUploadPolicy.safeFilename(document.getOriginalFilename(), document.getKind()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CarrierProfileView> pendingReview() {
        return profiles.findByStatusOrderBySubmittedAtAsc(CarrierStatus.PENDING_REVIEW).stream()
                .map(this::view).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CarrierProfileView> carriers(CarrierStatus status) {
        var all = status == null
                ? profiles.findAllByOrderByCreatedAtDesc()
                : profiles.findByStatusOrderBySubmittedAtAsc(status);
        return all.stream().map(this::view).toList();
    }

    @Override
    public CarrierProfileView suspend(String carrierId, String reason) {
        if (reason == null || reason.isBlank()) throw badRequest("Askıya alma gerekçesi zorunlu.");
        var profile = profiles.findByCarrierId(carrierId).orElseThrow(() -> notFound("Başvuru"));
        if (profile.getStatus() != CarrierStatus.APPROVED) {
            throw conflict("Yalnızca onaylı taşıyıcı askıya alınabilir.");
        }
        var now = Instant.now(clock);
        DomainAccess.suspend(profile, reason, now);
        events.publishEvent(new CarrierSuspended(carrierId, reason));
        log.info("Taşıyıcı operasyon kararıyla askıya alındı: {} — {}", carrierId, reason);
        return view(profile);
    }

    @Override
    public CarrierProfileView reactivate(String carrierId) {
        var profile = profiles.findByCarrierId(carrierId).orElseThrow(() -> notFound("Başvuru"));
        if (profile.getStatus() != CarrierStatus.SUSPENDED) {
            throw conflict("Yalnızca askıdaki taşıyıcı yeniden açılabilir.");
        }
        // Askıya alma sebebi süresi dolmuş belge olabilir; belge yenilenmeden
        // yeniden açmak, doğrulamayı tek tıkla bypass etmek olurdu
        var today = LocalDate.now(clock.withZone(TR));
        var invalid = requiredKinds(profile).stream()
                .filter(k -> profile.getDocuments().stream().noneMatch(d -> d.getKind() == k && d.valid(today)))
                .map(DocumentKind::displayName).toList();
        if (!invalid.isEmpty()) {
            throw conflict("Şu belgeler geçerli değil: " + String.join(", ", invalid));
        }
        var now = Instant.now(clock);
        DomainAccess.approve(profile, "Askı kaldırıldı", now);
        events.publishEvent(new CarrierApproved(profile.getCarrierId(), profile.getDisplayName(),
                profile.getVehicleTypeCode(), profile.getPlate()));
        return view(profile);
    }

    @Override
    public CarrierProfileView reviewDocument(String documentId, ReviewDecision decision) {
        if (decision.rejectedWithoutReason()) throw badRequest("Red gerekçesi zorunlu.");
        var document = documents.findById(uuid(documentId).orElseThrow(() -> notFound("Belge")))
                .orElseThrow(() -> notFound("Belge"));
        var now = Instant.now(clock);
        if (Boolean.TRUE.equals(decision.approved())) {
            DomainAccess.approveDocument(document, now);
        } else {
            DomainAccess.rejectDocument(document, decision.reason(), now);
        }
        return view(document.getProfile());
    }

    @Override
    public CarrierProfileView reviewProfile(String carrierId, ReviewDecision decision) {
        if (decision.rejectedWithoutReason()) throw badRequest("Red gerekçesi zorunlu.");
        var profile = profiles.findByCarrierId(carrierId).orElseThrow(() -> notFound("Başvuru"));
        if (profile.getStatus() != CarrierStatus.PENDING_REVIEW) {
            throw conflict("Yalnızca incelemedeki başvuru sonuçlandırılabilir.");
        }
        var now = Instant.now(clock);
        if (Boolean.TRUE.equals(decision.approved())) {
            // Belgelerin tek tek onaylanmadığı bir başvuru onaylanamaz; aksi hâlde
            // "her belge ayrı onay" (FR-2.3) kuralı kâğıt üstünde kalırdı
            var today = LocalDate.now(clock.withZone(TR));
            var unapproved = requiredKinds(profile).stream()
                    .filter(k -> profile.getDocuments().stream()
                            .noneMatch(d -> d.getKind() == k && d.valid(today)))
                    .map(DocumentKind::displayName).toList();
            if (!unapproved.isEmpty()) {
                throw conflict("Önce şu belgeleri onaylayın: " + String.join(", ", unapproved));
            }
            DomainAccess.approve(profile, decision.reason(), now);
            // ⚠️ Bu olay Keycloak'ta DRIVER rolünü ATAMIYOR. Rol atama bir yönetim
            // istemcisi gerektiriyor (ANAHTARLAR.md #19) ve o gelene kadar operasyon
            // ekibi rolü Keycloak arayüzünden elle veriyor. Burada rol verilmiş gibi
            // davranmak, onaylı ama iş alamayan taşıyıcılar üretirdi.
            events.publishEvent(new CarrierApproved(profile.getCarrierId(), profile.getDisplayName(),
                    profile.getVehicleTypeCode(), profile.getPlate()));
        } else {
            DomainAccess.reject(profile, decision.reason(), now);
        }
        return view(profile);
    }

    @Override
    public int expireOverdueDocuments() {
        var today = LocalDate.now(clock.withZone(TR));
        var now = Instant.now(clock);
        var overdue = documents.findExpired(DocumentStatus.APPROVED, today);
        for (var document : overdue) {
            DomainAccess.expireDocument(document, now);
            var profile = document.getProfile();
            if (profile.getStatus() == CarrierStatus.APPROVED) {
                var reason = document.getKind().displayName() + " süresi doldu.";
                DomainAccess.suspend(profile, reason, now);
                events.publishEvent(new CarrierSuspended(profile.getCarrierId(), reason));
                log.info("Taşıyıcı askıya alındı: {} — {}", profile.getCarrierId(), reason);
            }
        }
        return overdue.size();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpiringDocumentView> documentsExpiringWithin(int days) {
        var today = LocalDate.now(clock.withZone(TR));
        return documents.findByStatusAndExpiresOnLessThanEqualOrderByExpiresOnAsc(
                        DocumentStatus.APPROVED, today.plusDays(days)).stream()
                // Yalnızca hâlâ iş alabilen taşıyıcılar; askıdaki zaten listede
                .filter(d -> d.getProfile().getStatus() == CarrierStatus.APPROVED)
                .map(d -> new ExpiringDocumentView(
                        d.getProfile().getCarrierId(),
                        d.getProfile().getCompanyName() != null
                                ? d.getProfile().getCompanyName() : d.getProfile().getDisplayName(),
                        d.getProfile().getPlate(),
                        d.getKind(), d.getKind().displayName(), d.getExpiresOn(),
                        java.time.temporal.ChronoUnit.DAYS.between(today, d.getExpiresOn())))
                .toList();
    }

    // ── yardımcılar ──────────────────────────────────────────────────

    private CarrierProfile mine(String carrierId) {
        return profiles.findByCarrierId(carrierId)
                .orElseThrow(() -> notFound("Başvuru"));
    }

    private CarrierDocument ownedDocument(CarrierProfile profile, String documentId) {
        var id = uuid(documentId).orElseThrow(() -> notFound("Belge"));
        return profile.getDocuments().stream().filter(d -> d.getId().equals(id)).findFirst()
                .orElseThrow(() -> notFound("Belge"));
    }

    /** Bu araç tipi için istenen belge türleri. */
    private List<DocumentKind> requiredKinds(CarrierProfile profile) {
        int rank = fleet.capacityRank(profile.getVehicleTypeCode()).orElse(0);
        boolean company = profile.getCompanyName() != null;
        return Arrays.stream(DocumentKind.values())
                .filter(k -> k.requiredFor(rank) || (company && k == DocumentKind.TAX_PLATE))
                .toList();
    }

    /** Henüz hiç yüklenmemiş zorunlu belgeler. */
    private List<DocumentKind> missing(CarrierProfile profile) {
        return requiredKinds(profile).stream()
                .filter(k -> profile.getDocuments().stream().noneMatch(d -> d.getKind() == k))
                .toList();
    }

    private void deleteQuietly(String key) {
        try {
            storage.delete(key);
        } catch (RuntimeException e) {
            // Depodan silinemeyen eski dosya iş akışını durdurmamalı; kayıt zaten güncellendi
            log.warn("Eski belge dosyası silinemedi: {}", key, e);
        }
    }

    private static Optional<UUID> uuid(String id) {
        try {
            return Optional.of(UUID.fromString(id));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private CarrierProfileView view(CarrierProfile p) {
        var docs = p.getDocuments().stream()
                .sorted(java.util.Comparator.comparing(CarrierDocument::getKind))
                .map(d -> new CarrierDocumentView(d.getId().toString(), d.getKind(), d.getKind().displayName(),
                        d.getContentType(), d.getSizeBytes(), d.getOriginalFilename(), d.getExpiresOn(),
                        d.getStatus(), d.getRejectionReason(), d.getUploadedAt(), d.getReviewedAt()))
                .toList();
        return new CarrierProfileView(p.getId().toString(), p.getCarrierId(), p.getDisplayName(), p.getPhone(),
                p.getCompanyName(), p.getTaxId(), p.getVehicleTypeCode(), p.getPlate(), p.getStatus(),
                p.getReviewNote(), docs, missing(p), p.getSubmittedAt(), p.getReviewedAt(), p.getCreatedAt());
    }
}
