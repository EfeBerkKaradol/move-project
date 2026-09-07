package com.tasiyoruz.api.rating;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.rating.api.RateTripRequest;
import com.tasiyoruz.api.rating.api.RatingService;
import com.tasiyoruz.api.tracking.api.TripEvents.TripCompleted;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.awaitility.Awaitility.await;
import java.time.Duration;

/**
 * Puanlama yalnızca gerçekten tamamlanan işte, yalnızca yük veren tarafından ve bir kez.
 * Tamamlanma bilgisi taşıma modülünün olayından geliyor; test o olayı yayınlayıp sonucu bekliyor.
 */
class RatingServiceTest extends IntegrationTestBase {

    @Autowired RatingService ratings;
    @Autowired ApplicationEventPublisher events;
    @Autowired TransactionTemplate tx;

    /**
     * Olay gerçek yoldan gidiyor: transaction içinde yayınlanıyor, commit sonrası async
     * dinleyici yazıyor. Dinleyiciyi doğrudan çağırmak olay kaydını (event_publication)
     * hiç sınamazdı.
     */
    private String completedTrip(String shipper, String carrier) {
        var tripId = UUID.randomUUID().toString();
        long before = ratings.summaryOf(carrier).completedJobs();
        tx.executeWithoutResult(status -> events.publishEvent(
                new TripCompleted(tripId, UUID.randomUUID().toString(), shipper, carrier, new BigDecimal("2500"))));
        await().atMost(Duration.ofSeconds(10)).until(() -> ratings.summaryOf(carrier).completedJobs() > before);
        return tripId;
    }

    @Test
    void tamamlananIsPuanlanir_ortalamaVeIsSayisiHesaplanir() {
        var shipper = "s-" + UUID.randomUUID();
        var carrier = "c-" + UUID.randomUUID();
        var t1 = completedTrip(shipper, carrier);
        var t2 = completedTrip(shipper, carrier);

        ratings.rate(shipper, t1, new RateTripRequest(5, "Zamanında geldi"));
        ratings.rate(shipper, t2, new RateTripRequest(4, null));

        var s = ratings.summaryOf(carrier);
        assertThat(s.averageScore()).isEqualTo(4.5);
        assertThat(s.ratingCount()).isEqualTo(2);
        assertThat(s.completedJobs()).isEqualTo(2);
    }

    @Test
    void puaniOlmayanTasiyiciNullDoner_uydurmaBesYok() {
        var s = ratings.summaryOf("c-" + UUID.randomUUID());
        assertThat(s.averageScore()).isNull();
        assertThat(s.ratingCount()).isZero();
    }

    @Test
    void ayniIsIkinciKezPuanlanamaz_baskasiPuanlayamaz() {
        var shipper = "s-" + UUID.randomUUID();
        var carrier = "c-" + UUID.randomUUID();
        var trip = completedTrip(shipper, carrier);
        ratings.rate(shipper, trip, new RateTripRequest(3, null));

        assertThatThrownBy(() -> ratings.rate(shipper, trip, new RateTripRequest(1, null)))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("zaten puanlandı");
        assertThatThrownBy(() -> ratings.rate("baskasi", trip, new RateTripRequest(1, null)))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("size ait değil");
    }

    @Test
    void tamamlanmamisIsPuanlanamaz() {
        assertThatThrownBy(() -> ratings.rate("s", UUID.randomUUID().toString(), new RateTripRequest(5, null)))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("henüz tamamlanmadı");
    }
}
