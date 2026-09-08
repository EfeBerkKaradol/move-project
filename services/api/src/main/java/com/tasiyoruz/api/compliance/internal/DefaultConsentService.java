package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.*;
import com.tasiyoruz.api.compliance.domain.ConsentRecord;
import com.tasiyoruz.api.compliance.domain.DomainAccess;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rıza ve kabullerin kaydı.
 *
 * <p>Her kayıt denetim izine de düşüyor: rıza kaydının kendisi silinemez ama
 * "bu kayıt ne zaman oluştu" sorusunun ikinci bir tanığı olması, tek bir tablonun
 * bütünlüğüne bağımlılığı azaltıyor.
 */
@Service
@Transactional
class DefaultConsentService implements ConsentService {

    private final ConsentRecordRepository consents;
    private final LegalDocumentRepository documents;
    private final AuditTrail audit;
    private final ClientContextResolver client;
    private final Clock clock;

    DefaultConsentService(ConsentRecordRepository consents, LegalDocumentRepository documents,
                          AuditTrail audit, ClientContextResolver client, Clock clock) {
        this.consents = consents;
        this.documents = documents;
        this.audit = audit;
        this.client = client;
        this.clock = clock;
    }

    @Override
    public ConsentView record(String userId, RecordConsent request) {
        if (userId == null || userId.isBlank()) throw ComplianceExceptions.badRequest("Kullanıcı bilinmiyor.");

        var docType = request.docType();
        var version = request.docVersion();
        // Sürüm istemciden geldiyse güvenilmez: kullanıcı "v0.1'i kabul ettim"
        // diyerek yürürlükteki metni atlayabilirdi. Sunucu yürürlüktekini yazıyor.
        if (docType != null) {
            var active = documents.findByDocTypeAndActiveTrue(docType)
                    .orElseThrow(() -> ComplianceExceptions.badRequest("Belgenin yürürlükteki sürümü yok."));
            version = active.getVersion();
        }

        var saved = consents.save(ConsentRecord.of(userId, request.consentType(), docType, version,
                request.accepted(), request.source(), request.subjectRef(),
                client.ipAddress(), client.userAgent(), Instant.now(clock)));

        audit.record(userId, null, "CONSENT_RECORDED", "consent", saved.getId().toString(),
                Map.of("type", request.consentType().name(),
                        "accepted", request.accepted(),
                        "source", request.source(),
                        "documentVersion", version == null ? "-" : version));
        return view(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ConsentView> latest(String userId, ConsentType type) {
        return consents.findByUserIdAndConsentTypeOrderByCreatedAtDesc(userId, type, Limit.of(1))
                .stream().findFirst().map(DefaultConsentService::view);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isActive(String userId, ConsentType type) {
        return latest(userId, type).map(ConsentView::isActive).orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasAcceptedCurrent(String userId, LegalDocType docType) {
        return documents.findByDocTypeAndActiveTrue(docType)
                .map(d -> consents.hasAccepted(userId, docType, d.getVersion()))
                .orElse(false);
    }

    @Override
    public void withdraw(String userId, ConsentType type) {
        if (!type.isWithdrawable()) {
            // Sözleşmeden çekilmenin karşılığı hesabın kapatılmasıdır; tek bir
            // kaydı geri almak, sözleşmesiz ama açık bir hesap bırakırdı.
            throw ComplianceExceptions.badRequest(
                    "Bu kabul geri alınamaz. Sözleşmeden çekilmek için hesabını kapatman gerekiyor.");
        }
        var now = Instant.now(clock);
        var open = consents.findByUserIdAndConsentTypeAndAcceptedTrueAndWithdrawnAtIsNull(userId, type);
        open.forEach(c -> DomainAccess.withdraw(c, now));
        consents.saveAll(open);

        // Geri çekme de bir kayıt: "izin verdim mi, ne zaman geri aldım" sorusunun
        // cevabı yalnızca damgalanan satırlarda kalmasın
        consents.save(ConsentRecord.of(userId, type, null, null, false, "ACCOUNT_SETTINGS", null,
                client.ipAddress(), client.userAgent(), now));
        audit.record(userId, null, "CONSENT_WITHDRAWN", "consent", userId,
                Map.of("type", type.name(), "affected", open.size()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConsentView> historyOf(String userId) {
        return consents.findByUserIdOrderByCreatedAtDesc(userId).stream().map(DefaultConsentService::view).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConsentView> forSubject(String subjectRef) {
        return consents.findBySubjectRefOrderByCreatedAtAsc(subjectRef).stream()
                .map(DefaultConsentService::view).toList();
    }

    static ConsentView view(ConsentRecord c) {
        return new ConsentView(c.getId().toString(), c.getConsentType(), c.getDocType(), c.getDocVersion(),
                c.isAccepted(), c.getSource(), c.getSubjectRef(), c.getCreatedAt(), c.getWithdrawnAt());
    }
}
