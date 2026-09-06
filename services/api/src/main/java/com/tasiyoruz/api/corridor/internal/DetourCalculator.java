package com.tasiyoruz.api.corridor.internal;

import com.tasiyoruz.api.geo.api.District;
import com.tasiyoruz.api.geo.api.GeoPoint;
import com.tasiyoruz.api.geo.api.RouteProvider;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * "Ara nokta eklenirse rota ne kadar uzar?" (docs/11 §3).
 *
 * <p>Koridor İstanbul→İzmir ise, Ankara'daki bir yükün sapması
 * {@code (İstanbul→Ankara→İzmir) − (İstanbul→İzmir)}. Yükün kendi mesafesi bu farkın
 * içindedir; taşıyıcının kararı zaten "bu işi almak rotamı ne kadar uzatıyor" sorusuna
 * dayanıyor.
 */
@Component
class DetourCalculator {

    private final RouteProvider routes;

    DetourCalculator(RouteProvider routes) {
        this.routes = routes;
    }

    /** Sapma, kilometre. Rota sağlayıcısı takribî olabilir; sonuç da öyle işaretlenir. */
    double detourKm(District origin, District destination, District pickup, District dropoff) {
        var base = routes.estimate(List.of(point(origin), point(destination)));
        var withStops = routes.estimate(
                List.of(point(origin), point(pickup), point(dropoff), point(destination)));
        double meters = withStops.distanceMeters() - base.distanceMeters();
        return Math.max(meters, 0) / 1000.0;
    }

    private static GeoPoint point(District d) {
        return new GeoPoint(d.lat(), d.lng());
    }
}
