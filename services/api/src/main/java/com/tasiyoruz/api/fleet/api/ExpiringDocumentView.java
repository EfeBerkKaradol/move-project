package com.tasiyoruz.api.fleet.api;

import java.time.LocalDate;

/**
 * Süresi yaklaşan belge (docs/01 FR-2.4: 30 gün önce uyarı).
 *
 * <p>Operasyon panosu için: taşıyıcı süresi dolmadan uyarılırsa askıya alma hiç
 * gerekmez. Bugün bu uyarı yalnızca panelde; taşıyıcıya bildirim, bildirim modülüyle
 * gelecek.
 */
public record ExpiringDocumentView(
        String carrierId,
        String carrierName,
        String plate,
        DocumentKind kind,
        String kindDisplayName,
        LocalDate expiresOn,
        /** Negatifse süre zaten dolmuş ama gece taraması henüz işaretlememiş. */
        long daysLeft) {}
