package com.tasiyoruz.api.ordering.api;

import java.util.List;
import java.util.Optional;

/** Teklif pazarı: ilan yayınla → teklif topla → seç. */
public interface MarketplaceService {

    ListingView publish(String shipperId, CreateListingRequest request);

    Optional<ListingView> listing(String listingId);

    List<ListingView> listingsOf(String shipperId);

    /**
     * İlanın araç sahibine görünen hâli.
     *
     * <p>Teklif için gereken her şeyi taşıyor — beyan, fotoğraf, tarife tahmini —
     * ama yük verenin kimliğini taşımıyor. Görme hakkı olmayan taşıyıcıya boş döner:
     * "yetkin yok" demek bile o ilanın var olduğunu söylerdi.
     */
    Optional<ListingView> listingForCarrier(String carrierId, String listingId);

    ListingView cancel(String shipperId, String listingId, String reason);

    /** Açık ve süresi dolmamış ilanlar; araç tipi ve alış ili filtrelenebilir. */
    List<ListingView> openListings(String vehicleTypeCode, String cityCode);

    OfferView submitOffer(String carrierId, String carrierDisplayName, String listingId, SubmitOfferRequest request);

    OfferView withdrawOffer(String carrierId, String offerId);

    List<OfferView> offersOf(String carrierId);

    /** Yalnızca ilan sahibi görür. */
    List<OfferView> offersForListing(String shipperId, String listingId);

    /** Seçilen teklif kabul edilir, diğerleri reddedilir, ilan AWARDED olur. */
    ListingView acceptOffer(String shipperId, String listingId, String offerId);

    /**
     * Teklif penceresi dolan açık ilanları EXPIRED yapar ve bekleyen teklifleri kapatır.
     *
     * @return kapatılan ilan sayısı
     */
    int expireOverdueListings();

    /**
     * Açık ilanların il çifti bazında toplamı.
     *
     * <p>Yalnızca sayı döner; hangi ilan, kimin, hangi ilçede olduğu yok. Gizlilik
     * eşiği burada uygulanmıyor — yayın kararı ve k-anonimlik eşiği güven panosunun
     * işi (ADR-0008 kural 7: herkese açık yüzeye yalnızca trustboard yayın yapar).
     */
    java.util.List<CorridorSummary> openCorridors();

    /** Herkese açık sayaç: teklif toplayan ilan sayısı. */
    long openListingCount();

    /**
     * Yayından ilk teklife ortalama süre.
     *
     * @return örneklem yeterli değilse boş — birkaç ilana bakıp "ortalama 3 dakika"
     *         demek, gerçekte tutmayacak bir vaat üretir
     */
    java.util.Optional<java.time.Duration> averageTimeToFirstOffer();

    // ── Operasyon ────────────────────────────────────────────────────

    /** Tüm ilanlar, isteğe bağlı durum süzgeciyle. Yalnızca operasyon uçlarından çağrılır. */
    List<ListingView> allListings(ListingStatus status);

    /**
     * Operasyon bir ilanı kapatır (kötüye kullanım, yanlış bilgi, kullanıcı talebi).
     * Sahiplik aranmaz; gerekçe zorunlu ve kayda geçer.
     */
    ListingView cancelAsOperations(String listingId, String reason);
}
