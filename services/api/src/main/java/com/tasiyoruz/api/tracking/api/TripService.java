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
}
