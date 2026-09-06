package com.tasiyoruz.api.fleet.domain;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Durum geçişlerini yalnızca servis katmanına açar; controller bir başvuruyu doğrudan
 * APPROVED yapamaz (ordering ve corridor modüllerindeki aynı desen).
 */
public final class DomainAccess {
    private DomainAccess() {}

    public static void apply(CarrierProfile p, String displayName, String phone, String companyName,
                             String taxId, String vehicleTypeCode, String plate) {
        p.apply(displayName, phone, companyName, taxId, vehicleTypeCode, plate);
    }

    public static void submit(CarrierProfile p, Instant now) { p.submit(now); }
    public static void approve(CarrierProfile p, String note, Instant now) { p.approve(note, now); }
    public static void reject(CarrierProfile p, String reason, Instant now) { p.reject(reason, now); }
    public static void suspend(CarrierProfile p, String reason, Instant now) { p.suspend(reason, now); }
    public static void backToDraft(CarrierProfile p) { p.backToDraft(); }
    public static void addDocument(CarrierProfile p, CarrierDocument d) { p.addDocument(d); }
    public static void removeDocument(CarrierProfile p, CarrierDocument d) { p.removeDocument(d); }

    public static void replaceFile(CarrierDocument d, String key, String contentType, long size,
                                   String filename, LocalDate expiresOn, Instant now) {
        d.replaceFile(key, contentType, size, filename, expiresOn, now);
    }

    public static void approveDocument(CarrierDocument d, Instant now) { d.approve(now); }
    public static void rejectDocument(CarrierDocument d, String reason, Instant now) { d.reject(reason, now); }
    public static void expireDocument(CarrierDocument d, Instant now) { d.expire(now); }
}
