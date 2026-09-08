package com.tasiyoruz.api.compliance.api;

import java.time.Instant;

/** Verilmiş bir rızanın ya da kabulün kaydı. */
public record ConsentView(
        String id,
        ConsentType consentType,
        LegalDocType docType,
        String docVersion,
        boolean accepted,
        String source,
        String subjectRef,
        Instant createdAt,
        Instant withdrawnAt) {

    /** Şu an geçerli mi: kabul edilmiş ve geri çekilmemiş. */
    public boolean isActive() {
        return accepted && withdrawnAt == null;
    }
}
