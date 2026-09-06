package com.tasiyoruz.api.fleet.api;

/**
 * Belge türleri (docs/01 FR-2.2).
 *
 * <p>{@code required} yalnızca şahıs başvurusu için zorunluları işaretler; vergi levhası
 * kurumsal başvuruda ayrıca isteniyor. SRC ve K belgesi motokurye için anlamsız olduğundan
 * araç tipine göre {@link #requiredFor(int)} ile eleniyor.
 */
public enum DocumentKind {
    DRIVING_LICENCE("Sürücü belgesi", true, 0),
    VEHICLE_REGISTRATION("Araç ruhsatı", true, 0),
    TRAFFIC_INSURANCE("Zorunlu trafik sigortası", true, 0),
    /** Mesleki yeterlilik — ticari yük taşıyan sürücüler için. */
    SRC("SRC belgesi", true, Ranks.COMMERCIAL),
    /** Ulaştırma Bakanlığı yetki belgesi. */
    K_DOCUMENT("K yetki belgesi", true, Ranks.COMMERCIAL),
    CRIMINAL_RECORD("Adli sicil kaydı", false, 0),
    TAX_PLATE("Vergi levhası", false, 0);

    /**
     * Sabitler ayrı bir sınıfta: enum sabitlerinin argümanları, enum'un kendi statik
     * alanlarından önce değerlendiriliyor.
     */
    private static final class Ranks {
        /**
         * SRC ve K belgesinin istendiği en küçük araç sırası. Motokuryeden bunları
         * istemek başvuruyu gereksiz yere kilitlerdi; sıra katalogdan geliyor.
         */
        static final int COMMERCIAL = 3;
    }

    private final String displayName;
    private final boolean required;
    private final int minCapacityRank;

    DocumentKind(String displayName, boolean required, int minCapacityRank) {
        this.displayName = displayName;
        this.required = required;
        this.minCapacityRank = minCapacityRank;
    }

    public String displayName() {
        return displayName;
    }

    /** Bu araç sırası için başvurunun tamamlanması adına zorunlu mu? */
    public boolean requiredFor(int capacityRank) {
        return required && capacityRank >= minCapacityRank;
    }
}
