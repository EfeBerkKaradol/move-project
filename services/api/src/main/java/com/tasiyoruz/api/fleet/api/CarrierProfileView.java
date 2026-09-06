package com.tasiyoruz.api.fleet.api;

import java.time.Instant;
import java.util.List;

/**
 * Taşıyıcı başvurusunun görünümü.
 *
 * @param missingDocuments henüz yüklenmemiş zorunlu belgeler; arayüz eksik listesini
 *                         bundan çiziyor, kuralı kendi kopyalamıyor
 */
public record CarrierProfileView(
        String id,
        String displayName,
        String phone,
        String companyName,
        String taxId,
        String vehicleTypeCode,
        String plate,
        CarrierStatus status,
        String reviewNote,
        List<CarrierDocumentView> documents,
        List<DocumentKind> missingDocuments,
        Instant submittedAt,
        Instant reviewedAt,
        Instant createdAt) {

    /** İncelemeye gönderilebilir mi? */
    public boolean submittable() {
        return missingDocuments.isEmpty() && (status == CarrierStatus.DRAFT || status == CarrierStatus.REJECTED);
    }
}
