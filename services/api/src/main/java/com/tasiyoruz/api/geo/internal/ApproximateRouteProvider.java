package com.tasiyoruz.api.geo.internal;

import com.tasiyoruz.api.geo.api.GeoPoint;
import com.tasiyoruz.api.geo.api.RouteEstimate;
import com.tasiyoruz.api.geo.api.RouteProvider;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Google Routes API anahtarı yokken devreye giren takribî sağlayıcı.
 *
 * <p>Kuş uçuşu mesafeyi yol dolambaç katsayısıyla çarpar ve ortalama şehir içi hızdan
 * süre türetir. Trafik bilgisi yoktur. Ürettiği tahmin {@code approximate = true}
 * olarak işaretlenir ve kullanıcıya bu durum açıkça gösterilir — yanlış hassasiyet
 * izlenimi vermek fiyat güvenini bozar.
 *
 * <p>Anahtar geldiğinde {@code tasiyoruz.maps.api-key} tanımlanır ve bu bean devre dışı
 * kalır; yerine gerçek Routes çağrısı yapan uygulama geçer (ANAHTARLAR.md #1).
 */
@Component
@ConditionalOnProperty(name = "tasiyoruz.maps.api-key", havingValue = "", matchIfMissing = true)
class ApproximateRouteProvider implements RouteProvider {

    /**
     * Yol dolambaç katsayısı. Şehir içi sürüşte gerçek yol mesafesi kuş uçuşunun
     * yaklaşık 1,3-1,4 katıdır; boğaz geçişi gibi durumlarda daha da yüksektir.
     */
    private static final double DETOUR_FACTOR = 1.35;

    /**
     * Şehirlerarası bacaklar için ayrı model. Uzun mesafede yol kuş uçuşuna daha
     * yakın seyreder (otoyol) ve ortalama hız şehir içinin üç katına çıkar. Tek bir
     * şehir içi katsayı kullanılsaydı İstanbul→Ankara 18 saat gibi hesaplanır,
     * süre kalemi tarifeyi anlamsızlaştırırdı.
     */
    private static final double INTERCITY_THRESHOLD_METERS = 40_000;
    private static final double INTERCITY_DETOUR_FACTOR = 1.22;
    private static final double INTERCITY_SPEED_KMH = 70;

    /** Ortalama şehir içi hız (km/sa) — trafik dahil kaba tahmin. */
    private static final double AVERAGE_SPEED_KMH = 26;

    /** Her durakta yükleme/boşaltma için eklenen sabit süre. */
    private static final int STOP_OVERHEAD_SECONDS = 300;

    @Override
    public RouteEstimate estimate(List<GeoPoint> stops) {
        if (stops.size() < 2) {
            throw new IllegalArgumentException("Rota için en az iki durak gerekiyor");
        }

        double distanceMeters = 0;
        double drivingSeconds = 0;
        for (int i = 0; i < stops.size() - 1; i++) {
            double straight = Haversine.meters(stops.get(i), stops.get(i + 1));
            boolean intercity = straight > INTERCITY_THRESHOLD_METERS;
            double leg = straight * (intercity ? INTERCITY_DETOUR_FACTOR : DETOUR_FACTOR);
            double speed = intercity ? INTERCITY_SPEED_KMH : AVERAGE_SPEED_KMH;
            distanceMeters += leg;
            drivingSeconds += leg / 1000.0 / speed * 3600;
        }
        int durationSeconds = (int) Math.round(drivingSeconds) + (stops.size() - 1) * STOP_OVERHEAD_SECONDS;

        return new RouteEstimate((int) Math.round(distanceMeters), durationSeconds, null, true);
    }
}
