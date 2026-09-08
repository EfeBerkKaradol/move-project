package com.tasiyoruz.api.ordering.internal;

import static com.tasiyoruz.api.ordering.internal.MarketplaceExceptions.*;

import com.tasiyoruz.api.ordering.api.ListingPhotoView;
import com.tasiyoruz.api.ordering.api.ListingPhotos;
import com.tasiyoruz.api.ordering.domain.DomainAccess;
import com.tasiyoruz.api.ordering.domain.ListingPhoto;
import com.tasiyoruz.api.shared.storage.ObjectStorage;
import com.tasiyoruz.api.shared.storage.UploadValidation;
import java.io.InputStream;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Yük fotoğrafları: yükle, sil, ilana iliştir, indir.
 *
 * <p>Akış tersten işliyor — fotoğraf ilandan önce var oluyor. Alternatifi, yayın
 * isteğine dosyaları da koymaktı (tek multipart); o zaman kullanıcı yayınlamadan
 * önce ne yüklediğini göremez, yanlış kareyi tek tek silemezdi.
 */
@Service
@Transactional
class ListingPhotoService implements ListingPhotos {

    private static final Logger log = LoggerFactory.getLogger(ListingPhotoService.class);

    /** İliştirilmemiş yükleme bu kadar bekledikten sonra süpürülür. */
    static final Duration ORPHAN_TTL = Duration.ofHours(24);

    /** İlan başına üst sınır; istekteki {@code @Size} ile aynı olmalı. */
    static final int MAX_PER_LISTING = 10;

    private final ListingPhotoRepository photos;
    private final LoadListingRepository listings;
    private final CarrierVisibility visibility;
    private final ObjectStorage storage;
    private final Clock clock;

    ListingPhotoService(ListingPhotoRepository photos, LoadListingRepository listings,
                        CarrierVisibility visibility, ObjectStorage storage, Clock clock) {
        this.photos = photos;
        this.listings = listings;
        this.visibility = visibility;
        this.storage = storage;
        this.clock = clock;
    }

    @Override
    public ListingPhotoView upload(String ownerId, String contentType, long size, InputStream content) {
        // Yalnızca fotoğraf: bu kareler araç sahibinin gördüğü şey, PDF'in orada işi yok
        UploadValidation.validateImage(contentType, size);
        var key = UploadValidation.storageKey("listing-photos", ownerId, "cargo");
        storage.put(key, contentType, size, content);
        var saved = photos.save(ListingPhoto.uploaded(ownerId, key, contentType, size, Instant.now(clock)));
        return view(saved);
    }

    @Override
    public void delete(String ownerId, String photoId) {
        var photo = photos.findById(uuid(photoId)).orElseThrow(() -> notFound("Fotoğraf"));
        if (!photo.isOwnedBy(ownerId)) throw forbidden();
        // Yayınlanmış ilanın karesi silinemez: araç sahibi teklifini ona bakarak verdi
        if (photo.isAttached()) throw conflict("Yayınlanmış ilanın fotoğrafı silinemez. İlanı iptal edebilirsin.");
        photos.delete(photo);
        storage.delete(photo.getStorageKey());
    }

    /**
     * Yayın anında kareleri ilana bağlar.
     *
     * <p>Sahiplik ve iliştirilmemiş olma burada doğrulanıyor: kimlikler istemciden
     * geliyor ve başkasının yüklediği bir kare ilana çakılabilirdi.
     */
    List<ListingPhoto> attach(String shipperId, UUID listingId, List<String> photoIds, Instant now) {
        var ids = photoIds.stream().distinct().map(ListingPhotoService::uuid).toList();
        if (ids.size() > MAX_PER_LISTING) throw badRequest("En fazla %d fotoğraf ekleyebilirsin.".formatted(MAX_PER_LISTING));

        var found = photos.findAllById(ids);
        if (found.size() != ids.size()) throw badRequest("Fotoğraflardan biri bulunamadı; sayfayı yenileyip tekrar dener misin?");
        for (var photo : found) {
            if (!photo.isOwnedBy(shipperId)) throw forbidden();
            if (photo.isAttached()) throw conflict("Bu fotoğraf başka bir ilana eklenmiş.");
            DomainAccess.attach(photo, listingId, now);
        }
        return photos.saveAll(found);
    }

    @Transactional(readOnly = true)
    List<ListingPhoto> of(UUID listingId) {
        return photos.findByListingIdOrderByUploadedAtAsc(listingId);
    }

    /** Liste ekranları için toplu okuma; ilan başına ayrı sorgu atmamak adına. */
    @Transactional(readOnly = true)
    Map<UUID, List<ListingPhoto>> byListing(List<UUID> listingIds) {
        if (listingIds.isEmpty()) return Map.of();
        return photos.findByListingIdInOrderByUploadedAtAsc(listingIds).stream()
                .collect(Collectors.groupingBy(ListingPhoto::getListingId));
    }

    /**
     * Fotoğrafı indirir.
     *
     * <p>Kimin görebileceği yükün mahremiyetini belirliyor: ilan sahibi her zaman,
     * araç sahibi ise ilanı teklif için görebildiği sürece. İş verildikten sonra
     * yalnızca işi alan taşıyıcıda kalıyor — teklif vermeyenlerin bir daha bakmak
     * için sebebi yok.
     */
    @Transactional(readOnly = true)
    ObjectStorage.StoredObject download(String userId, boolean isCarrier, String listingId, String photoId) {
        var listing = listings.findById(uuid(listingId)).orElseThrow(() -> notFound("İlan"));
        var photo = photos.findById(uuid(photoId)).orElseThrow(() -> notFound("Fotoğraf"));
        if (!listing.getId().equals(photo.getListingId())) throw notFound("Fotoğraf");

        if (!(listing.isOwnedBy(userId) || (isCarrier && visibility.maySee(listing, userId)))) {
            throw forbidden();
        }
        return storage.get(photo.getStorageKey()).orElseThrow(() -> notFound("Fotoğraf"));
    }

    /**
     * Yayınlanmadan bırakılmış yüklemeleri siler.
     *
     * <p>Kullanıcı fotoğrafı yükleyip vazgeçtiğinde kayıt ve dosya ortada kalıyor.
     * Depoyu şişirmesinin yanında bu bir gizlilik borcu: kimsenin göremeyeceği bir
     * fotoğrafı süresiz saklamanın gerekçesi yok.
     *
     * @return silinen kare sayısı
     */
    int sweepOrphans() {
        var stale = photos.findByListingIdIsNullAndUploadedAtBefore(Instant.now(clock).minus(ORPHAN_TTL));
        for (var photo : stale) {
            // Depo silmesi patlarsa kayıt kalsın ki bir sonraki tur yeniden denesin
            storage.delete(photo.getStorageKey());
        }
        photos.deleteAll(stale);
        if (!stale.isEmpty()) log.info("İliştirilmemiş {} yük fotoğrafı süpürüldü.", stale.size());
        return stale.size();
    }

    static ListingPhotoView view(ListingPhoto p) {
        return new ListingPhotoView(p.getId().toString(), p.getSizeBytes(), p.getUploadedAt());
    }

    private static UUID uuid(String raw) {
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            throw notFound("Kayıt");
        }
    }
}
