package com.tasiyoruz.api.tracking.api;

import java.time.Instant;

/**
 * Aracın bildirdiği konum.
 *
 * <p>Yalnızca işin taraflarına gidiyor. Adres çözümlemesi yok: koordinat
 * olduğu gibi veriliyor ve harita istemcide kendi çizdiğimiz Türkiye
 * haritasının üstünde gösteriliyor — dışarıya bir harita servisine istek
 * çıkmıyor (docs/03: harita çağrıları backend'den geçer).
 *
 * @param accuracyM cihazın bildirdiği yatay doğruluk (metre); bilinmiyorsa null
 */
public record TripLocationView(double lat, double lng, Double accuracyM, Instant recordedAt) {}
