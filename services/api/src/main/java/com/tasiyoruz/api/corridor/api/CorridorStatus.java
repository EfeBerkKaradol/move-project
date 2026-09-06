package com.tasiyoruz.api.corridor.api;

/** Koridorun yaşam döngüsü. */
public enum CorridorStatus {
    /** Eşleştirmeye açık. */
    ACTIVE,
    /** Taşıyıcı geçici olarak durdurdu; kayıt duruyor, eşleşme üretilmiyor. */
    PAUSED,
    /** Kalkış penceresi geçti. */
    EXPIRED
}
