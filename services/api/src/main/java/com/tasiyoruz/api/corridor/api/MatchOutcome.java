package com.tasiyoruz.api.corridor.api;

/** Eşleşmenin taşıyıcı tarafındaki sonucu. */
public enum MatchOutcome {
    /** Gösterildi, taşıyıcı henüz bir şey yapmadı. */
    PENDING,
    /** Taşıyıcı bu ilana teklif verdi. */
    OFFERED,
    /** Taşıyıcı ilgilenmediğini söyledi; listeden düşer. */
    IGNORED,
    /** İlanın süresi doldu ya da başkasına verildi. */
    EXPIRED
}
