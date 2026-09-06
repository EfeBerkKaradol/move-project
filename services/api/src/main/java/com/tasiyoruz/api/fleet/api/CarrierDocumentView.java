package com.tasiyoruz.api.fleet.api;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Yüklenmiş belgenin görünümü. Depo anahtarı dışa verilmiyor: dosyaya erişim yalnızca
 * kimlik doğrulanmış indirme ucundan, sahiplik kontrolüyle yapılıyor.
 */
public record CarrierDocumentView(
        String id,
        DocumentKind kind,
        String kindDisplayName,
        String contentType,
        long sizeBytes,
        String originalFilename,
        LocalDate expiresOn,
        DocumentStatus status,
        String rejectionReason,
        Instant uploadedAt,
        Instant reviewedAt) {}
