package com.tasiyoruz.api.ordering.api;

/**
 * Bir il çiftindeki açık ilan sayısı.
 *
 * <p>Toplu veri: tek bir ilanı, adresi ya da kullanıcıyı işaret etmiyor. Herkese
 * açık yüzeyde <strong>yalnızca bu düzey</strong> yayınlanabilir — ADR-0008 devam
 * eden siparişlerin ilçe düzeyinde gösterilmesini reddediyor ("şu anda şu semtteki
 * şu ev boşaltılıyor" bilgisi hırsızlık ve takip riski). Sayı ise kimseyi
 * tanımlamıyor; ADR toplu canlı sayaçları açıkça serbest bırakıyor.
 *
 * @param fromCity alış ili
 * @param toCity teslim ili
 * @param listingCount o koridorda teklif toplayan açık ilan sayısı
 */
public record CorridorSummary(String fromCity, String toCity, int listingCount) {}
