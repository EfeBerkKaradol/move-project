package com.tasiyoruz.api.trustboard.api;

/**
 * Herkese açık koridor kaydı: "İstanbul → Ankara, 7 açık ilan".
 *
 * @param fromCity alış ili
 * @param toCity teslim ili
 * @param openListings o koridorda teklif toplayan ilan sayısı
 */
public record PublicCorridorView(String fromCity, String toCity, int openListings) {}
