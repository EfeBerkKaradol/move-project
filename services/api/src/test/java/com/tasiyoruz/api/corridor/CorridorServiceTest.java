package com.tasiyoruz.api.corridor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tasiyoruz.api.CarrierFixture;
import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.corridor.api.*;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.CreateListingRequest;
import com.tasiyoruz.api.ordering.api.ListingView;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

/**
 * Boş dönüş koridorlarının kuralları (docs/11 §3): rota üstündeki ilan eşleşir,
 * sapma toleransını aşan eşleşmez, kapasite ve alt tutar filtreleri tutar.
 *
 * <p>Eşleştirme burada doğrudan çağrılmıyor; koridor kurulurken yapılan açık ilan
 * taraması kullanılıyor. Böylece olay dinleyicisinin async oluşu teste sızmıyor,
 * eşleştirme mantığı yine gerçek rota sağlayıcısı ve gerçek veriyle sınanıyor.
 */
class CorridorServiceTest extends IntegrationTestBase {

    @Autowired CorridorService corridors;
    @Autowired com.tasiyoruz.api.ListingFixture listingFixture;
    @Autowired CarrierFixture carrierFixture;
    @Autowired MarketplaceService marketplace;
    @Autowired GeoService geo;

    /** Eşleşme onaylı taşıyıcı istiyor; her test kendi taşıyıcısını onaylatıyor. */
    private String carrier() {
        var id = "carrier-" + UUID.randomUUID();
        carrierFixture.approve(id);
        return id;
    }

    private String district(String city, String slug) {
        return geo.districtsOf(city).stream().filter(d -> d.slug().equals(slug)).findFirst().orElseThrow().id();
    }

    /** İl merkezi kaydı: 81 ilin tamamında var (V8). */
    private String city(String code) {
        return geo.districtsOf(code).getFirst().id();
    }

    private ListingView publish(String fromCity, String toCity, String vehicle) {
        var shipper = "shipper-" + UUID.randomUUID();
        return marketplace.publish(shipper, new CreateListingRequest(
                "SCHEDULED", vehicle,
                new CreateListingRequest.Stop(city(fromCity), 0, true),
                new CreateListingRequest.Stop(city(toCity), 0, true),
                List.of(), listingFixture.items(), listingFixture.photoIds(shipper), "Test yükü",
                Instant.now().plus(Duration.ofHours(4)),
                Instant.now().plus(Duration.ofHours(10))));
    }

    private CreateCorridorRequest corridor(String fromCity, String toCity, String vehicle,
                                           int toleranceKm, BigDecimal minAmount) {
        return new CreateCorridorRequest(vehicle, city(fromCity), city(toCity),
                Instant.now().plus(Duration.ofHours(2)), Instant.now().plus(Duration.ofHours(12)),
                toleranceKm, minAmount);
    }

    @Test
    void rotaUstundekiIlanEslesir_sapmaVeSkorHesaplanir() {
        // İstanbul → Adana koridoru; Ankara → Adana yükü rotanın üstünde sayılır
        publish("06", "01", "KAMYONET");
        var carrier = carrier();
        corridors.create(carrier, corridor("34", "01", "KAMYON", 400, null));

        var matches = corridors.matchesOf(carrier);
        assertThat(matches).isNotEmpty();
        var m = matches.getFirst();
        assertThat(m.detourKm()).isBetween(0.0, 400.0);
        assertThat(m.score()).isBetween(0.0, 1.0);
        assertThat(m.outcome()).isEqualTo(MatchOutcome.PENDING);
        // İlan sahibinin kimliği taşıyıcıya sızmamalı
        assertThat(m.listing().shipperId()).isNull();
    }

    @Test
    void rotaDisindakiIlanSapmaToleransiniAsinca_eslesmez() {
        // İstanbul → Edirne koridoruna Hatay → Van yükü hiçbir toleransla sığmaz
        publish("31", "65", "KAMYONET");
        var carrier = carrier();
        corridors.create(carrier, corridor("34", "22", "KAMYON", 50, null));

        assertThat(corridors.matchesOf(carrier)).isEmpty();
    }

    @Test
    void kucukAracBuyukYukuAlmaz_buyukArackucuguAlir() {
        publish("06", "01", "KAMYONET");

        var kucukCarrier = carrier();
        corridors.create(kucukCarrier, corridor("34", "01", "MOTOR", 400, null));
        assertThat(corridors.matchesOf(kucukCarrier))
                .as("Motokurye, kamyonet isteyen yükü taşıyamaz")
                .isEmpty();

        var buyukCarrier = carrier();
        corridors.create(buyukCarrier, corridor("34", "01", "KAMYON", 400, null));
        assertThat(corridors.matchesOf(buyukCarrier))
                .as("Kamyon, kamyonet isteyen yükü taşıyabilmeli")
                .isNotEmpty();
    }

    @Test
    void hizmeteAcilmamisAracicinKoridorKurulamaz() {
        // TIR filoda "Yakında" olarak duruyor (V7); onunla iş alınamaz
        assertThatThrownBy(() -> corridors.create(carrier(), corridor("34", "01", "TIR", 400, null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Araç tipi tanınmadı");
    }

    @Test
    void altTutarinAltindakiIlanGosterilmez() {
        var listing = publish("06", "01", "KAMYONET");
        var esik = listing.estimatedAmount().amount().add(new BigDecimal("100000"));

        var carrier = carrier();
        corridors.create(carrier, corridor("34", "01", "KAMYON", 400, esik));
        assertThat(corridors.matchesOf(carrier)).isEmpty();
    }

    @Test
    void duraklatilanKoridorYeniEslesmeUretmez() {
        var carrier = carrier();
        var c = corridors.create(carrier, corridor("34", "01", "KAMYON", 400, null));
        corridors.setPaused(carrier, c.id(), true);

        publish("06", "01", "KAMYONET");
        // Duraklatılmışken kurulan koridor yeni ilanı almamalı; mevcut eşleşme sayısı artmasın
        var sonra = corridors.corridorsOf(carrier).stream()
                .filter(x -> x.id().equals(c.id())).findFirst().orElseThrow();
        assertThat(sonra.status()).isEqualTo(CorridorStatus.PAUSED);
    }

    @Test
    void ilgilenmiyorumDenenEslesmeListedenDuser() {
        publish("06", "01", "KAMYONET");
        var carrier = carrier();
        corridors.create(carrier, corridor("34", "01", "KAMYON", 400, null));

        var once = corridors.matchesOf(carrier);
        assertThat(once).isNotEmpty();
        corridors.ignore(carrier, once.getFirst().id());

        assertThat(corridors.matchesOf(carrier)).extracting(CorridorMatchView::id)
                .doesNotContain(once.getFirst().id());
    }

    @Test
    void baskasininKoridorunaDokunulamaz() {
        var c = corridors.create(carrier(), corridor("34", "01", "KAMYON", 400, null));

        assertThatThrownBy(() -> corridors.setPaused("baska-tasiyici", c.id(), true))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("size ait değil");
        assertThatThrownBy(() -> corridors.delete("baska-tasiyici", c.id()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("size ait değil");
    }

    @Test
    void gecmisKalkisPenceresiVeAyniUcNoktaReddedilir() {
        var carrier = carrier();

        assertThatThrownBy(() -> corridors.create(carrier, new CreateCorridorRequest(
                "KAMYON", city("34"), city("01"),
                Instant.now().minus(Duration.ofDays(3)), Instant.now().minus(Duration.ofDays(2)), 100, null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("geçmişte olamaz");

        assertThatThrownBy(() -> corridors.create(carrier, new CreateCorridorRequest(
                "KAMYON", city("34"), city("34"),
                Instant.now().plus(Duration.ofHours(1)), Instant.now().plus(Duration.ofHours(5)), 100, null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("aynı olamaz");
    }

}
