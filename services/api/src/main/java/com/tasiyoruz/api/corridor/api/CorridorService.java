package com.tasiyoruz.api.corridor.api;

import java.util.List;

/** Taşıyıcının boş dönüş koridorları ve bunlara düşen ilanlar. */
public interface CorridorService {

    CorridorView create(String carrierId, CreateCorridorRequest request);

    List<CorridorView> corridorsOf(String carrierId);

    /** ACTIVE ↔ PAUSED. */
    CorridorView setPaused(String carrierId, String corridorId, boolean paused);

    void delete(String carrierId, String corridorId);

    /** Taşıyıcının bekleyen eşleşmeleri, puana göre yüksekten düşüğe. */
    List<CorridorMatchView> matchesOf(String carrierId);

    /** Taşıyıcı ilgilenmediğini söyler; eşleşme listeden düşer. */
    void ignore(String carrierId, String matchId);

    /**
     * Kalkış penceresi geçmiş aktif koridorları EXPIRED yapar.
     *
     * @return kapatılan koridor sayısı
     */
    int expireOverdueCorridors();

    /** Operasyon panosu için: eşleştirmeye açık koridor sayısı. */
    long activeCorridorCount();
}
