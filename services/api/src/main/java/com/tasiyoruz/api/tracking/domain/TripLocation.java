package com.tasiyoruz.api.tracking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Taşıma sırasında sürücünün bildirdiği tek bir konum.
 *
 * <p><strong>Kişisel veri.</strong> Yalnızca işin tarafları okuyabiliyor, yalnızca
 * iş sürerken yazılıyor ve iş kapandığında iz siliniyor (bkz. V24 migration'ının
 * başındaki not). Güven panosuna hiç akmıyor.
 */
@Entity
@Table(name = "trip_locations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripLocation {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false) private UUID tripId;
    @Column(nullable = false) private double lat;
    @Column(nullable = false) private double lng;
    /*
     * Sütun adı AÇIKÇA yazılıyor. Varsayılan adlandırma stratejisi `accuracyM`
     * alanını `accuracym` yapıyor, migration ise `accuracy_m` diyor: şema
     * doğrulaması açılışta patlıyordu.
     */
    /** Cihazın bildirdiği yatay doğruluk (metre); bilinmiyorsa null. */
    @Column(name = "accuracy_m") private Double accuracyM;
    @Column(nullable = false) private Instant recordedAt;

    public static TripLocation of(UUID tripId, double lat, double lng, Double accuracyM, Instant now) {
        var l = new TripLocation();
        l.tripId = tripId;
        l.lat = lat;
        l.lng = lng;
        l.accuracyM = accuracyM;
        l.recordedAt = now;
        return l;
    }
}
