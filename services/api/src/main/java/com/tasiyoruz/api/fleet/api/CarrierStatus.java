package com.tasiyoruz.api.fleet.api;

/** Taşıyıcı başvurusunun yaşam döngüsü (docs/01 FR-2.3). */
public enum CarrierStatus {
    /** Başvuru açıldı, belgeler eksik. */
    DRAFT,
    /** Zorunlu belgeler yüklendi, operasyon incelemesinde. */
    PENDING_REVIEW,
    /** Onaylandı; iş alabilir. */
    APPROVED,
    /** Reddedildi; gerekçe kayıtta. */
    REJECTED,
    /** Belgesi süresi doldu ya da operasyon askıya aldı. */
    SUSPENDED
}
