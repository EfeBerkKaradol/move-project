package com.tasiyoruz.api.trustboard.internal;

import static org.assertj.core.api.Assertions.assertThat;

import com.tasiyoruz.api.CarrierFixture;
import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.ListingFixture;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.CreateListingRequest;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import com.tasiyoruz.api.ordering.api.SubmitOfferRequest;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.CacheManager;

/**
 * Herkese açık ilan listesi.
 *
 * <p>Buradaki asıl sınav ne döndüğü değil, <strong>ne dönmediği</strong>: yükün
 * fotoğrafı, açıklaması, kalem dökümü ve yük verenin kimliği bu yüzeyde hiç
 * olmamalı. Kayıt tipi bunları zaten taşımıyor; test o sözleşmenin sessizce
 * genişlemesine karşı duruyor.
 */
class PublicListingsTest extends IntegrationTestBase {

    @Autowired PublicListingsController controller;
    @Autowired MarketplaceService marketplace;
    @Autowired ListingFixture listingFixture;
    @Autowired CarrierFixture carrierFixture;
    @Autowired GeoService geo;

    /**
     * Uç 60 saniye önbellekli — her ana sayfa ziyareti çekirdek tablolara sorgu
     * atmasın diye. Testte bu, bir önceki testin sonucunu geri veriyordu; önbellek
     * burada sınanan davranış değil.
     */
    @Autowired @Qualifier("shortLivedCacheManager") CacheManager caches;

    static final String SHIPPER = "acik-liste-shipper", CARRIER = "acik-liste-carrier";
    private static boolean approved;

    @BeforeEach
    void temizBaslangic() {
        if (!approved) {
            carrierFixture.approve(CARRIER);
            approved = true;
        }
        caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
    }

    /** Yayın ile okuma arasında önbellek kalmasın; ölçülen şey uç, önbellek değil. */
    private void onbellegiBosalt() {
        caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
    }

    @Test
    void acikIlanYayinlanir_rotaAracVeBuyuklukIle() {
        var listing = marketplace.publish(SHIPPER, request());

        var published = find(listing.id());
        assertThat(published).isNotNull();
        assertThat(published.fromCity()).isEqualTo("İstanbul");
        assertThat(published.fromDistrict()).isEqualTo("Kadıköy");
        assertThat(published.vehicleTypeCode()).isEqualTo("KAMYONET");
        // Beyandaki adetlerin toplamı: 1 buzdolabı + 8 koli
        assertThat(published.pieceCount()).isEqualTo(9);
        assertThat(published.volumeM3()).isEqualByComparingTo("1.8");
        assertThat(published.distanceKm()).isPositive();
        assertThat(published.estimatedAmount()).isPositive();
    }

    /**
     * Sözleşme sınırı: herkese açık kayıt yalnızca bu alanları taşıyor. Yeni bir alan
     * eklenirse bu test kırılır ve eklemenin bilinçli olması gerekir.
     */
    @Test
    void herkeseAcikKayitYalnizcaIzinVerilenAlanlariTasir() {
        var alanlar = com.tasiyoruz.api.trustboard.api.PublicListingView.class.getRecordComponents();

        assertThat(alanlar).extracting(java.lang.reflect.RecordComponent::getName)
                .containsExactlyInAnyOrder(
                        "id", "fromCity", "fromDistrict", "fromDistrictId",
                        "toCity", "toDistrict", "toDistrictId", "vehicleTypeCode",
                        "distanceKm", "pieceCount", "volumeM3", "estimatedAmount",
                        "offerCount", "serviceModel", "publishedAt", "expiresAt")
                .doesNotContain("photos", "cargoDescription", "cargoItems", "shipperId",
                        "pickupFloor", "dropoffFloor");
    }

    /** İş üstlenildiği anda ilan herkese açık yüzeyden düşüyor. */
    @Test
    void isVerilenIlanYayindanDuser() {
        var listing = marketplace.publish(SHIPPER, request());
        assertThat(find(listing.id())).isNotNull();

        var offer = marketplace.submitOffer(CARRIER, "Ali D.", listing.id(),
                new SubmitOfferRequest(new BigDecimal("4200"), null, null));
        marketplace.acceptOffer(SHIPPER, listing.id(), offer.id());

        assertThat(find(listing.id())).isNull();
    }

    @Test
    void iptalEdilenIlanYayindanDuser() {
        var listing = marketplace.publish(SHIPPER, request());
        marketplace.cancel(SHIPPER, listing.id(), "Vazgeçtim");

        assertThat(find(listing.id())).isNull();
    }

    @Test
    void aracTipiSuzulur() {
        marketplace.publish(SHIPPER, request());

        onbellegiBosalt();
        assertThat(controller.listings("KAMYONET", null))
                .extracting(v -> v.vehicleTypeCode()).containsOnly("KAMYONET");
        assertThat(controller.listings("MOTOR", null))
                .noneMatch(v -> v.vehicleTypeCode().equals("KAMYONET"));
    }

    private com.tasiyoruz.api.trustboard.api.PublicListingView find(String id) {
        onbellegiBosalt();
        return controller.listings(null, null).stream()
                .filter(v -> v.id().equals(id)).findFirst().orElse(null);
    }

    private CreateListingRequest request() {
        return new CreateListingRequest("INSTANT", "KAMYONET",
                new CreateListingRequest.Stop(district("34", "kadikoy"), 3, false),
                new CreateListingRequest.Stop(district("06", "cankaya"), 0, true),
                List.of(), listingFixture.items(), listingFixture.photoIds(SHIPPER), true,
                "Kırılacak eşya var, dikkatli taşınmalı.", null, null);
    }

    private String district(String city, String slug) {
        return geo.districtsOf(city).stream().filter(d -> d.slug().equals(slug)).findFirst().orElseThrow().id();
    }
}
