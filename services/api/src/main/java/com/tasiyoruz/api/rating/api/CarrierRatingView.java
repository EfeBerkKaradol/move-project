package com.tasiyoruz.api.rating.api;

/**
 * Taşıyıcının puan özeti.
 *
 * @param averageScore 1-5 arası ortalama; hiç puan yoksa null — uydurma 5,0 gösterilmez
 * @param ratingCount  puan sayısı
 * @param completedJobs tamamlanan iş sayısı (puanlanmamış işler dahil)
 */
public record CarrierRatingView(String carrierId, Double averageScore, long ratingCount, long completedJobs) {}
