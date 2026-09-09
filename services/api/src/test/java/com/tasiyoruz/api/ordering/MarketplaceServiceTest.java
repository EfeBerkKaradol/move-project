package com.tasiyoruz.api.ordering;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tasiyoruz.api.CarrierFixture;
import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.*;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

/**
 * Tek turlu teklif pazarının kuralları: sunucu tarafı fiyat snapshot'ı, taşıyıcı başına
 * tek teklif, sahiplik, kabulde diğerlerinin reddi ve kapalı ilana işlem yasağı.
 */
class MarketplaceServiceTest extends IntegrationTestBase {

    @Autowired MarketplaceService marketplace;
    @Autowired com.tasiyoruz.api.ListingFixture listingFixture;
    @Autowired GeoService geo;
    @Autowired com.tasiyoruz.api.fleet.api.CarrierService carriers;
    @Autowired com.tasiyoruz.api.MutableClock clock;

    static final String SHIPPER = "shipper-1", CARRIER_A = "carrier-a", CARRIER_B = "carrier-b";

    @Autowired CarrierFixture carrierFixture;

    @BeforeEach
    void onayliTasiyicilar() {
        if (!approved) {
            carrierFixture.approve(CARRIER_A);
            carrierFixture.approve(CARRIER_B);
            approved = true;
        }
    }

    private static boolean approved;

    private String district(String city, String slug) {
        return geo.districtsOf(city).stream().filter(d -> d.slug().equals(slug)).findFirst().orElseThrow().id();
    }

    /**
     * Koridor özeti herkese açık yüzeyin kaynağı: il düzeyinde, yalnızca sayı.
     * Farklı ilçelerden ilanlar tek koridorda toplanmalı — ilçe kırılımı dışarı
     * sızarsa ADR-0008'in reddettiği ayrıntı yayınlanmış olur.
     *
     * <p>Testler veritabanını paylaştığı için mutlak sayı değil DEĞİŞİM ölçülüyor.
     */
    @Test
    void acikKoridorlarIlDuzeyindeToplanir() {
        var before = corridorCount("İstanbul", "Ankara");

        publish(); // Kadıköy → Çankaya
        publish();
        marketplace.publish(SHIPPER, new CreateListingRequest(
                "INSTANT", "PANELVAN",
                new CreateListingRequest.Stop(district("34", "besiktas"), 0, true),
                new CreateListingRequest.Stop(district("06", "cankaya"), 0, true),
                List.of(), listingFixture.items(), listingFixture.photoIds(SHIPPER), true, null, null, null));

        assertThat(corridorCount("İstanbul", "Ankara")).isEqualTo(before + 3);
        // Üç ilan iki farklı İstanbul ilçesinden; yine de tek satır olmalı
        assertThat(marketplace.openCorridors())
                .filteredOn(c -> c.fromCity().equals("İstanbul") && c.toCity().equals("Ankara"))
                .hasSize(1);
    }

    /** Kapanan ilan koridor sayısından da düşmeli; pano yalnızca açık işi gösteriyor. */
    @Test
    void iptalEdilenIlanKoridordanDuser() {
        var before = corridorCount("İstanbul", "Ankara");
        var listing = publish();
        assertThat(corridorCount("İstanbul", "Ankara")).isEqualTo(before + 1);

        marketplace.cancel(SHIPPER, listing.id(), "Vazgeçtim");

        assertThat(corridorCount("İstanbul", "Ankara")).isEqualTo(before);
    }

    private int corridorCount(String from, String to) {
        return marketplace.openCorridors().stream()
                .filter(c -> c.fromCity().equals(from) && c.toCity().equals(to))
                .mapToInt(c -> c.listingCount())
                .sum();
    }

    private ListingView publish() {
        return marketplace.publish(SHIPPER, new CreateListingRequest(
                "INSTANT", "KAMYONET",
                new CreateListingRequest.Stop(district("34", "kadikoy"), 3, false),
                new CreateListingRequest.Stop(district("06", "cankaya"), 0, true),
                List.of("PORTERAGE"), listingFixture.items(), listingFixture.photoIds(SHIPPER), true,
                "Buzdolabı ve 8 koli", null, null));
    }

    private static SubmitOfferRequest offer(String amount) {
        return new SubmitOfferRequest(new BigDecimal(amount), null, null);
    }

    @Test
    void ilanYayinlaninca_tarifeSunucudaHesaplanipSnapshotlanir() {
        var l = publish();

        assertThat(l.status()).isEqualTo(ListingStatus.OPEN);
        assertThat(l.listingNumber()).matches("TS-\\d{4}-\\d{6}");
        assertThat(l.estimatedAmount().amount()).isPositive();
        assertThat(l.estimate()).containsKeys("breakdown", "totalAmount", "distanceMeters");
        assertThat(l.pickup().cityName()).isEqualTo("İstanbul");
        assertThat(l.dropoff().cityName()).isEqualTo("Ankara");
        assertThat(l.expiresAt()).isAfter(l.publishedAt());
    }

    @Test
    void tasiyiciAyniIlanaIkinciTeklifVeremez_geriCekipYenidenVerebilir() {
        var l = publish();
        var first = marketplace.submitOffer(CARRIER_A, "Ali D.", l.id(), offer("9500"));

        assertThatThrownBy(() -> marketplace.submitOffer(CARRIER_A, "Ali D.", l.id(), offer("9000")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("zaten teklif verdiniz");

        marketplace.withdrawOffer(CARRIER_A, first.id());
        var again = marketplace.submitOffer(CARRIER_A, "Ali D.", l.id(), offer("9000"));

        assertThat(again.id()).isEqualTo(first.id()); // aynı kayıt, tek-tur kısıtı korunur
        assertThat(again.amount().amount()).isEqualByComparingTo("9000.00");
        assertThat(again.status()).isEqualTo(OfferStatus.SUBMITTED);
    }

    @Test
    void kabulEdilince_digerTekliflerReddedilirVeIlanKapanir() {
        var l = publish();
        var a = marketplace.submitOffer(CARRIER_A, "Ali D.", l.id(), offer("9500"));
        var b = marketplace.submitOffer(CARRIER_B, "Hasan Y.", l.id(), offer("8800"));

        var awarded = marketplace.acceptOffer(SHIPPER, l.id(), b.id());

        assertThat(awarded.status()).isEqualTo(ListingStatus.AWARDED);
        assertThat(awarded.awardedOfferId()).isEqualTo(b.id());
        var offers = marketplace.offersForListing(SHIPPER, l.id());
        assertThat(offers).extracting(OfferView::id, OfferView::status)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(a.id(), OfferStatus.REJECTED),
                        org.assertj.core.groups.Tuple.tuple(b.id(), OfferStatus.ACCEPTED));

        // Kapanan ilana ne teklif ne ikinci kabul
        assertThatThrownBy(() -> marketplace.submitOffer("carrier-c", "X", l.id(), offer("7000")))
                .hasMessageContaining("artık teklif almıyor");
        assertThatThrownBy(() -> marketplace.acceptOffer(SHIPPER, l.id(), a.id()))
                .hasMessageContaining("artık açık değil");
        assertThat(marketplace.openListings(null, null)).extracting(ListingView::id).doesNotContain(l.id());
    }

    @Test
    void sahipOlmayanTeklifleriGoremezVeKabulEdemez() {
        var l = publish();
        var a = marketplace.submitOffer(CARRIER_A, "Ali D.", l.id(), offer("9500"));

        assertThatThrownBy(() -> marketplace.offersForListing("baskasi", l.id()))
                .hasMessageContaining("size ait değil");
        assertThatThrownBy(() -> marketplace.acceptOffer("baskasi", l.id(), a.id()))
                .hasMessageContaining("size ait değil");
        assertThatThrownBy(() -> marketplace.submitOffer(SHIPPER, "Ben", l.id(), offer("1")))
                .hasMessageContaining("Kendi ilanınıza");
    }

    @Test
    void acikIlanlarTasiyiciyaSahipKimligiOlmadanVeFiltreliListelenir() {
        var l = publish();
        marketplace.submitOffer(CARRIER_A, "Ali D.", l.id(), offer("9500"));

        var open = marketplace.openListings("KAMYONET", "34");
        var mine = open.stream().filter(x -> x.id().equals(l.id())).findFirst().orElseThrow();
        assertThat(mine.shipperId()).isNull();
        assertThat(mine.offerCount()).isEqualTo(1);
        assertThat(marketplace.openListings("MOTOR", "34")).extracting(ListingView::id).doesNotContain(l.id());
        assertThat(marketplace.openListings("KAMYONET", "06")).extracting(ListingView::id).doesNotContain(l.id());
    }

    @Test
    void iptalEdilince_bekleyenTekliflerReddedilir() {
        var l = publish();
        var a = marketplace.submitOffer(CARRIER_A, "Ali D.", l.id(), offer("9500"));

        var cancelled = marketplace.cancel(SHIPPER, l.id(), "Vazgeçtim");

        assertThat(cancelled.status()).isEqualTo(ListingStatus.CANCELLED);
        assertThat(marketplace.offersOf(CARRIER_A)).filteredOn(o -> o.id().equals(a.id()))
                .singleElement().extracting(OfferView::status).isEqualTo(OfferStatus.REJECTED);
    }

    @Test
    void onaysizTasiyiciTeklifVeremez() {
        var l = publish();
        var basvurusuz = "carrier-" + java.util.UUID.randomUUID();

        assertThatThrownBy(() -> marketplace.submitOffer(basvurusuz, "Kayıtsız", l.id(), offer("9000")))
                .as("Belge doğrulamasının yaptırımı bu kontrol")
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("onaylı olması gerekiyor");
    }

    @Test
    void askiyaAlinanTasiyiciTeklifVeremez() {
        var askidaki = "carrier-" + java.util.UUID.randomUUID();
        carrierFixture.approve(askidaki);
        var l = publish();
        // Onaylıyken verebiliyor
        marketplace.submitOffer(askidaki, "Onaylı", l.id(), offer("9000"));

        carriers.suspend(askidaki, "Belge süresi doldu");
        var yeniIlan = publish();

        assertThatThrownBy(() -> marketplace.submitOffer(askidaki, "Onaylı", yeniIlan.id(), offer("9000")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("onaylı olması gerekiyor");
    }

    @Test
    void suresiDolanIlanKapanir_bekleyenTekliflerReddedilir() {
        var l = publish(); // anlık ilan: 6 saat teklif toplar
        marketplace.submitOffer(CARRIER_A, "Ali D.", l.id(), offer("9000"));
        assertThat(marketplace.expireOverdueListings()).as("Henüz süresi dolmadı").isZero();

        clock.advance(Duration.ofHours(7));
        try {
            assertThat(marketplace.expireOverdueListings()).isPositive();

            var sonra = marketplace.listing(l.id()).orElseThrow();
            assertThat(sonra.status())
                    .as("Arayüzdeki 'süresi doldu' rozeti ancak bu geçişle görünebilir")
                    .isEqualTo(ListingStatus.EXPIRED);
            assertThat(marketplace.offersOf(CARRIER_A)).filteredOn(o -> o.listingId().equals(l.id()))
                    .allMatch(o -> o.status() == OfferStatus.REJECTED);
        } finally {
            clock.reset();
        }
    }

    /**
     * Planlı ilanda teklif penceresi alış saatinde kapanıyor: alış başladıktan sonra
     * gelen teklifin karşılığı yok.
     */
    @Test
    void planliIlanAlisPenceresiniSaklar_veTeklifAlisSaatindeKapanir() {
        var basla = java.time.Instant.now().plus(Duration.ofDays(3));
        var bit = basla.plus(Duration.ofHours(4));

        var listing = marketplace.publish(SHIPPER, new CreateListingRequest(
                "SCHEDULED", "KAMYONET",
                new CreateListingRequest.Stop(district("34", "kadikoy"), 0, true),
                new CreateListingRequest.Stop(district("06", "cankaya"), 0, true),
                List.of(), listingFixture.items(), listingFixture.photoIds(SHIPPER), true,
                null, basla, bit));

        assertThat(listing.pickupWindowStart()).isEqualTo(basla);
        assertThat(listing.pickupWindowEnd()).isEqualTo(bit);
        assertThat(listing.expiresAt()).isEqualTo(basla);

        marketplace.cancel(SHIPPER, listing.id(), "Test temizliği");
    }

    @Test
    void gecmisAlisPenceresiyleIlanYayinlanamaz() {
        // Aksi hâlde ilan anında süresi dolmuş sayılır, beş dakika içinde kapanır ve
        // kullanıcı neden kapandığını anlamazdı
        assertThatThrownBy(() -> marketplace.publish(SHIPPER, new CreateListingRequest(
                "SCHEDULED", "KAMYONET",
                new CreateListingRequest.Stop(district("34", "kadikoy"), 0, true),
                new CreateListingRequest.Stop(district("06", "cankaya"), 0, true),
                List.of(), listingFixture.items(), listingFixture.photoIds(SHIPPER), true, "Geçmiş",
                java.time.Instant.now().minus(Duration.ofHours(2)),
                java.time.Instant.now().minus(Duration.ofHours(1)))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("geçmişte olamaz");
    }
}
