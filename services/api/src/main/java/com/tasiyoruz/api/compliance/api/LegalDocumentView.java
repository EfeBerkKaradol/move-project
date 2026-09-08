package com.tasiyoruz.api.compliance.api;

import java.time.Instant;

/**
 * Yürürlükteki bir hukuki belgenin künyesi.
 *
 * <p>Metnin kendisi burada değil: depoda duruyor ve web tarafında işleniyor
 * (apps/web/src/content/legal). Burada taşınan şey, rıza kaydının bağlanacağı
 * kimlik — tip ve sürüm.
 */
public record LegalDocumentView(
        LegalDocType docType,
        String version,
        String title,
        String slug,
        Instant effectiveAt,
        boolean requiresReacceptance) {}
