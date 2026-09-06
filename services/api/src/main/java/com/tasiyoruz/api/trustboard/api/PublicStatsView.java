package com.tasiyoruz.api.trustboard.api;

/**
 * Ana sayfadaki sayaçlar.
 *
 * <p>Kişisel veri yok, yalnızca toplam sayı (ADR-0008). Yeterli veri yoksa alan
 * {@code null} dönüyor ve arayüz tire gösteriyor — uydurma bir rakamı gerçekmiş gibi
 * göstermek, ürünün güven iddiasını en baştan çürütür.
 *
 * @param averageMinutesToFirstOffer örneklem yetersizse null
 */
public record PublicStatsView(
        long openListings,
        long verifiedCarriers,
        Integer averageMinutesToFirstOffer) {}
