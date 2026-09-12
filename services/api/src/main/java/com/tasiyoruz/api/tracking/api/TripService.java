package com.tasiyoruz.api.tracking.api;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface TripService {

    /** İlan AWARDED olduğunda çağrılır (olay dinleyicisi). Aynı ilan için ikinci çağrı yok sayılır. */
    TripView startFromAward(String listingId, String shipperId, String carrierId, String carrierDisplayName,
                            BigDecimal agreedAmount);

    Optional<TripView> trip(String userId, String tripId);

    Optional<TripView> tripOfListing(String userId, String listingId);

    List<TripView> tripsOfCarrier(String carrierId);

    List<TripView> tripsOfShipper(String shipperId);

    /** Taşıyıcı bir sonraki aşamaya geçer; DELIVERED için {@link #deliver} kullanılır. */
    TripView advance(String carrierId, String tripId, TripStage expectedNext);

    /**
     * Teslim bildirimi. En az bir {@link TripPhotoKind#DELIVERY} fotoğrafı yüklenmiş
     * olmalı — kanıtsız teslim kanıtı zaten kanıt değil.
     */
    TripView deliver(String carrierId, String tripId, ProofOfDeliveryRequest pod);

    /** Taşıma fotoğrafı yükler. Hasar karesini yük sahibi de yükleyebilir. */
    TripView addPhoto(String userId, String tripId, TripPhotoKind kind, UploadedPhoto photo);

    /** Fotoğrafı indirir; yalnızca işin tarafları erişebilir. */
    PhotoDownload downloadPhoto(String userId, String tripId, String photoId);

    /** Yükleyen kendi karesini silebilir; teslim sonrası kanıt dokunulmaz. */
    TripView deletePhoto(String userId, String tripId, String photoId);

    /**
     * Yüklenen dosyanın servise taşınan hâli. Web katmanı tipi domain'e sızsaydı
     * yükleme yalnızca HTTP üzerinden test edilebilirdi.
     */
    record UploadedPhoto(String contentType, long size, java.io.InputStream content) {}

    record PhotoDownload(java.io.InputStream content, String contentType, long size, String filename) {}

    /** Müşteri teslimatı onaylar → COMPLETED. */
    TripView confirmDelivery(String shipperId, String tripId);

    /**
     * Yük sahibinden ses çıkmayan teslimatları kapatır.
     *
     * <p>Teslim bildirildikten sonra onay beklemek gerekiyor ama süresiz
     * bekleyemez: cevap vermeyen tek bir müşteri, taşıyıcının hakedişini
     * belirsiz süre askıda tutuyordu. Fotoğraflı teslim kanıtı zaten alınmış
     * durumda; sessizlik itiraz değil.
     *
     * <p>İtirazı olan müşteri süre dolmadan operasyona başvuruyor — orada iş
     * elle karara bağlanıyor.
     *
     * @return otomatik kapatılan iş sayısı
     */
    int autoConfirmStaleDeliveries();

    /**
     * Sürücünün konum bildirimi. Yalnızca işin taşıyıcısı ve yalnızca iş
     * sürerken yazabiliyor.
     */
    TripView recordLocation(String carrierId, String tripId, double lat, double lng, Double accuracyM);

    /** İşin son konumları, en yeniden eskiye. Yalnızca işin tarafları görebiliyor. */
    List<TripLocationView> locations(String userId, String tripId);

    /** Tüm işler, en yeni önce. Yalnızca operasyon uçlarından çağrılır. */
    List<TripView> allTrips();
}
