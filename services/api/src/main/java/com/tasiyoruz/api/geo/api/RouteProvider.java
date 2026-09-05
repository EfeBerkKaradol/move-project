package com.tasiyoruz.api.geo.api;

import java.util.List;

/**
 * Mesafe ve süre kaynağı. Google Routes API anahtarı gelene kadar takribî bir
 * uygulama devrede; geçiş yalnızca bu arayüzün başka bir bean'i olacak
 * (bkz. ANAHTARLAR.md #1).
 */
public interface RouteProvider {

    /** Duraklar sırayla gezilerek toplam rota tahmini üretir. */
    RouteEstimate estimate(List<GeoPoint> stops);
}
