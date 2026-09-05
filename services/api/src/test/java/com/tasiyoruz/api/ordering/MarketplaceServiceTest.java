package com.tasiyoruz.api.ordering;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.*;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

/**
 * Tek turlu teklif pazarının kuralları: sunucu tarafı fiyat snapshot'ı, taşıyıcı başına
 * tek teklif, sahiplik, kabulde diğerlerinin reddi ve kapalı ilana işlem yasağı.
 */
class MarketplaceServiceTest extends IntegrationTestBase {

    @Autowired MarketplaceService marketplace;
    @Autowired GeoService geo;

    static final String SHIPPER = "shipper-1", CARRIER_A = "carrier-a", CARRIER_B = "carrier-b";

    private String district(String city, String slug) {
        return geo.districtsOf(city).stream().filter(d -> d.slug().equals(slug)).findFirst().orElseThrow().id();
    }

    private ListingView publish() {
        return marketplace.publish(SHIPPER, new CreateListingRequest(
                "INSTANT", "KAMYONET",
                new CreateListingRequest.Stop(district("34", "kadikoy"), 3, false),
                new CreateListingRequest.Stop(district("06", "cankaya"), 0, true),
                List.of("PORTERAGE"), "Buzdolabı ve 8 koli", null, null));
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
}
