package com.tasiyoruz.api.admin.api;

import com.tasiyoruz.api.pricing.api.Money;

/**
 * Operasyon panosu.
 *
 * <p>Sayılar canlı sorgudan; önbelleklenmiyor çünkü operasyonun panoya bakma sebebi
 * "şu an ne oluyor" sorusu ve bayat sayı yanlış karar verdirir.
 */
public record OverviewView(
        long openListings,
        long listingsAwaitingOffer,
        long activeTrips,
        long completedTrips,
        long carriersPendingReview,
        long approvedCarriers,
        long suspendedCarriers,
        long activeCorridors,
        /** Tamamlanan işlerin toplam tutarı — komisyonsuz dönemde ciro değil, hacim. */
        Money completedVolume) {}
