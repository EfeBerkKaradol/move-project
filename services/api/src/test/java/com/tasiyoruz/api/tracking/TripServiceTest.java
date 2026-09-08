package com.tasiyoruz.api.tracking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tasiyoruz.api.CarrierFixture;
import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.CreateListingRequest;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import com.tasiyoruz.api.ordering.api.SubmitOfferRequest;
import com.tasiyoruz.api.tracking.api.ProofOfDeliveryRequest;
import com.tasiyoruz.api.tracking.api.TripPhotoKind;
import com.tasiyoruz.api.tracking.api.TripService;
import com.tasiyoruz.api.tracking.api.TripService;
import com.tasiyoruz.api.tracking.api.TripStage;
import com.tasiyoruz.api.tracking.api.TripView;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Aşama makinesi kuralları ve ilan kabulünden işin açılması (Modulith olayı). */
class TripServiceTest extends IntegrationTestBase {

    @Autowired TripService tripService;
    @Autowired com.tasiyoruz.api.ListingFixture listingFixture;
    @Autowired MarketplaceService marketplace;
    @Autowired GeoService geo;

    static final String SHIPPER = "trip-shipper", CARRIER = "trip-carrier";

    @Autowired CarrierFixture carrierFixture;

    /** Teklif verme onaylı başvuru istiyor; taşıyıcı bir kez onaylanıyor. */
    @BeforeEach
    void onayliTasiyici() {
        if (!approved) {
            carrierFixture.approve(CARRIER);
            approved = true;
        }
    }

    private static boolean approved;

    private String district(String city, String slug) {
        return geo.districtsOf(city).stream().filter(d -> d.slug().equals(slug)).findFirst().orElseThrow().id();
    }

    /** Kabul edilmiş bir ilan üzerinden iş açar (olay yolunu değil servisi doğrudan). */
    private TripView freshTrip() {
        var l = marketplace.publish(SHIPPER, new CreateListingRequest("INSTANT", "PANELVAN",
                new CreateListingRequest.Stop(district("34", "kadikoy"), 0, true),
                new CreateListingRequest.Stop(district("34", "besiktas"), 0, true), List.of(),
                listingFixture.items(), listingFixture.photoIds(SHIPPER), true, null, null, null));
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

        // Kanıtsız teslim reddedilir
        assertThatThrownBy(() -> tripService.deliver(CARRIER, t.id(),
                new ProofOfDeliveryRequest("Ayşe Y.", "Kapıda teslim")))
                .hasMessageContaining("teslim fotoğrafı");

        tripService.addPhoto(CARRIER, t.id(), TripPhotoKind.DELIVERY, photo());
        s = tripService.deliver(CARRIER, t.id(), new ProofOfDeliveryRequest("Ayşe Y.", "Kapıda teslim"));
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

    /** Küçük ama gerçek bir JPEG; depoya da böyle yazılıyor. */
    private static TripService.UploadedPhoto photo() {
        var bytes = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9};
        return new TripService.UploadedPhoto("image/jpeg", bytes.length,
                new java.io.ByteArrayInputStream(bytes));
    }

    @Test
    void yukSahibiYalnizcaHasarKaresiEkleyebilir() {
        var t = freshTrip();

        assertThatThrownBy(() -> tripService.addPhoto(SHIPPER, t.id(), TripPhotoKind.DELIVERY, photo()))
                .as("Teslim kanıtını karşı tarafın üretmesi anlamsız olurdu")
                .hasMessageContaining("size ait değil");

        var withDamage = tripService.addPhoto(SHIPPER, t.id(), TripPhotoKind.DAMAGE, photo());
        assertThat(withDamage.photosOf(TripPhotoKind.DAMAGE)).hasSize(1)
                .allMatch(p -> p.uploadedByRole().equals("SHIPPER"));
    }

    @Test
    void fotografIndirilir_ucuncuKisiErisemez() {
        var t = freshTrip();
        var withPhoto = tripService.addPhoto(CARRIER, t.id(), TripPhotoKind.PICKUP, photo());
        var photoId = withPhoto.photosOf(TripPhotoKind.PICKUP).getFirst().id();

        var download = tripService.downloadPhoto(SHIPPER, t.id(), photoId);
        assertThat(download.contentType()).isEqualTo("image/jpeg");
        assertThat(download.size()).isEqualTo(4);
        assertThat(download.filename()).endsWith(".jpeg");

        assertThatThrownBy(() -> tripService.downloadPhoto("baskasi", t.id(), photoId))
                .hasMessageContaining("size ait değil");
    }

    @Test
    void teslimBildirildiktenSonraKanitSilinemez() {
        var t = deliveredTrip();
        var photoId = tripService.trip(CARRIER, t.id()).orElseThrow()
                .photosOf(TripPhotoKind.DELIVERY).getFirst().id();

        assertThatThrownBy(() -> tripService.deletePhoto(CARRIER, t.id(), photoId))
                .as("Teslimi bildirip kanıtı silmek mümkün olmamalı")
                .hasMessageContaining("silinemez");
    }

    @Test
    void fotografSayisiSinirli() {
        var t = freshTrip();
        for (int i = 0; i < 5; i++) tripService.addPhoto(CARRIER, t.id(), TripPhotoKind.PICKUP, photo());

        assertThatThrownBy(() -> tripService.addPhoto(CARRIER, t.id(), TripPhotoKind.PICKUP, photo()))
                .hasMessageContaining("en fazla 5 fotoğraf");
    }

    @Test
    void fotografOlmayanDosyaReddedilir() {
        var t = freshTrip();
        var pdf = new TripService.UploadedPhoto("application/pdf", 10,
                new java.io.ByteArrayInputStream(new byte[10]));

        assertThatThrownBy(() -> tripService.addPhoto(CARRIER, t.id(), TripPhotoKind.DELIVERY, pdf))
                .hasMessageContaining("fotoğraf olmalı");
    }

    /** Teslim noktasına kadar ilerletilmiş, kanıtı yüklenmiş ve teslim bildirilmiş iş. */
    private TripView deliveredTrip() {
        var t = freshTrip();
        var s = tripService.advance(CARRIER, t.id(), TripStage.EN_ROUTE_TO_PICKUP);
        for (int i = 0; i < 5; i++) s = tripService.advance(CARRIER, s.id(), null);
        tripService.addPhoto(CARRIER, t.id(), TripPhotoKind.DELIVERY, photo());
        return tripService.deliver(CARRIER, t.id(), new ProofOfDeliveryRequest("Ayşe Y.", null));
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
        assertThatThrownBy(() -> tripService.deliver(CARRIER, t.id(), new ProofOfDeliveryRequest("X", null)))
                .hasMessageContaining("teslim noktasında");
        assertThat(Duration.between(t.startedAt(), java.time.Instant.now())).isLessThan(Duration.ofMinutes(1));
    }
}
