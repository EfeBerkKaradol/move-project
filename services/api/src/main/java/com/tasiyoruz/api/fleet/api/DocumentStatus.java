package com.tasiyoruz.api.fleet.api;

/** Tek bir belgenin onay durumu (docs/01 FR-2.3). */
public enum DocumentStatus {
    PENDING, APPROVED, REJECTED,
    /** Son kullanma tarihi geçti (FR-2.4). */
    EXPIRED
}
