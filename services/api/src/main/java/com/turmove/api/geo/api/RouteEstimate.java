package com.turmove.api.geo.api;

/**
 * İki nokta arası rota tahmini.
 *
 * @param approximate true ise mesafe gerçek yol ağından değil, takribî hesaplanmıştır.
 *                    Kullanıcıya bu durum açıkça bildirilir — yanlış hassasiyet
 *                    izlenimi vermek fiyat güvenini bozar.
 */
public record RouteEstimate(
        int distanceMeters, int durationSeconds, String polyline, boolean approximate) {}
