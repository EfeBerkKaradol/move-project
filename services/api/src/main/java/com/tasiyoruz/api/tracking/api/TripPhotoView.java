package com.tasiyoruz.api.tracking.api;

import java.time.Instant;

/**
 * Fotoğrafın görünümü. Depo anahtarı dışa verilmiyor; dosyaya erişim yalnızca
 * kimlik doğrulanmış indirme ucundan, işin tarafı olma kontrolüyle yapılıyor.
 */
public record TripPhotoView(
        String id,
        TripPhotoKind kind,
        String kindDisplayName,
        String contentType,
        long sizeBytes,
        /** Kimin çektiği: DRIVER ya da SHIPPER. Uyuşmazlıkta belirleyici. */
        String uploadedByRole,
        Instant uploadedAt) {}
