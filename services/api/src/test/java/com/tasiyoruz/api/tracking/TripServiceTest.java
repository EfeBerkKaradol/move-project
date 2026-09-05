package com.tasiyoruz.api.tracking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.CreateListingRequest;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import com.tasiyoruz.api.ordering.api.SubmitOfferRequest;
import com.tasiyoruz.api.tracking.api.ProofOfDeliveryRequest;
import com.tasiyoruz.api.tracking.api.TripService;
import com.tasiyoruz.api.tracking.api.TripStage;
import com.tasiyoruz.api.tracking.api.TripView;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Aşama makinesi kuralları ve ilan kabulünden işin açılması (Modulith olayı). */
class TripServiceTest extends IntegrationTestBase {

    @Autowired TripService tripService;
    @Autowired MarketplaceService marketplace;
    @Autowired GeoService geo;

    static final String SHIPPER = "trip-shipper", CARRIER = "trip-carrier";

    private String district(String city, String slug) {
        return geo.districtsOf(city).stream().filter(d -> d.slug().equals(slug)).findFirst().orElseThrow().id();
    }

    /** Kabul edilmiş bir ilan üzerinden iş açar (olay yolunu değil servisi doğrudan). */
    private TripView freshTrip() {
        var l = marketplace.publish(SHIPPER, new CreateListingRequest("INSTANT", "PANELVAN",
                new CreateListingRequest.Stop(district("34", "kadikoy"), 0, true),
                new CreateListingRequest.Stop(district("34", "besiktas"), 0, true), List.of(), null, null, null));
        var o = marketplace.submitOffer(CARRIER, "Ali D.", l.id(), new SubmitOfferRequest(new BigDecimal("2500"), null, null));
        marketplace.acceptOffer(SHIPPER, l.id(), o.id());
        return tripService.startFromAward(l.id(), SHIPPER, CARRIER, "Ali D.", new BigDecimal("2500"));
    }

    @Test
    void ilanKabulundenIsAcilir_veOlayIkinciKezGelirseYeniIsAcilmaz() {
        var t = freshTrip();
        assertThat(t.stage()).isEqualTo(TripStage.DRIVER_ASSIGNED);
        assertThat(t.nextStage()).isEqualTo(TripStage.EN_ROUTE_TO_PICKUP);
        assertThat(t.events()).extracting(TripView.Event::stage).containsExactly(TripStage.DRIVER_ASSIGNED);

        var again = tripService.startFromAward(t.listingId(), SHIPPER, CARRIER, "Ali D.", new BigDecimal("2500"));
        assertThat(again.id()).isEqualTo(t.id());
    }

    @Test
    void asamalarSiraylaIlerler_atlanamaz_teslimIcinKanitSart() {
        var t = freshTrip();

        // Eskimiş istemci: beklenen aşama uyuşmuyor
        assertThatThrownBy(() -> tripService.advance(CARRIER, t.id(), TripStage.IN_TRANSIT))
                .hasMessageContaining("Aşama güncel değil");

        var s = tripService.advance(CARRIER, t.id(), TripStage.EN_ROUTE_TO_PICKUP);
        s = tripService.advance(CARRIER, s.id(), null); // ARRIVED_AT_PICKUP
        s = tripService.advance(CARRIER, s.id(), null); // LOADING
        s = tripService.advance(CARRIER, s.id(), null); // IN_TRANSIT
        s = tripService.advance(CARRIER, s.id(), null); // ARRIVED_AT_DROPOFF
        assertThat(s.stage()).isEqualTo(TripStage.ARRIVED_AT_DROPOFF);

        // Müşteri teslim bildirilmeden onaylayamaz
        assertThatThrownBy(() -> tripService.confirmDelivery(SHIPPER, t.id())).hasMessageContaining("teslimi bildirmesi");

        s = tripService.advance(CARRIER, s.id(), null); // UNLOADING
        assertThatThrownBy(() -> tripService.advance(CARRIER, t.id(), null)).hasMessageContaining("teslim kanıtı");

        s = tripService.deliver(CARRIER, t.id(), new ProofOfDeliveryRequest("Ayşe Y.", "Kapıda teslim", null));
        assertThat(s.stage()).isEqualTo(TripStage.DELIVERED);
        assertThat(s.proofOfDelivery().receivedByName()).isEqualTo("Ayşe Y.");
        assertThat(s.nextStage()).isNull();

        var done = tripService.confirmDelivery(SHIPPER, t.id());
        assertThat(done.stage()).isEqualTo(TripStage.COMPLETED);
        assertThat(done.completedAt()).isNotNull();
        assertThat(done.events()).extracting(TripView.Event::stage).containsExactly(
                TripStage.DRIVER_ASSIGNED, TripStage.EN_ROUTE_TO_PICKUP, TripStage.ARRIVED_AT_PICKUP, TripStage.LOADING,
                TripStage.IN_TRANSIT, TripStage.ARRIVED_AT_DROPOFF, TripStage.UNLOADING, TripStage.DELIVERED, TripStage.COMPLETED);
    }

    @Test
    void sahiplikKontrolleri() {
        var t = freshTrip();
        assertThatThrownBy(() -> tripService.advance("baskasi", t.id(), null)).hasMessageContaining("size ait değil");
        assertThatThrownBy(() -> tripService.confirmDelivery("baskasi", t.id())).hasMessageContaining("size ait değil");
        assertThat(tripService.trip("baskasi", t.id())).isEmpty();
        assertThat(tripService.tripOfListing(SHIPPER, t.listingId())).isPresent();
        assertThat(tripService.tripsOfCarrier(CARRIER)).extracting(TripView::id).contains(t.id());
    }

    @Test
    void teslimKanitiYalnizcaTeslimNoktasinda() {
        var t = freshTrip();
        assertThatThrownBy(() -> tripService.deliver(CARRIER, t.id(), new ProofOfDeliveryRequest("X", null, null)))
                .hasMessageContaining("teslim noktasında");
        assertThat(Duration.between(t.startedAt(), java.time.Instant.now())).isLessThan(Duration.ofMinutes(1));
    }
}
