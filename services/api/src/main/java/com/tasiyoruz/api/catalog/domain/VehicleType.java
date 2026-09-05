package com.tasiyoruz.api.catalog.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Araç tipi ve kapasitesi. Kapasiteler kodda sabit değildir — operasyon panelinden
 * güncellenir (bkz. docs/08, FR-4.3).
 */
@Entity
@Table(name = "vehicle_types")
@Getter
@NoArgsConstructor
public class VehicleType {

    @Id
    @Column(length = 32)
    private String code;

    @Column(nullable = false)
    private String displayName;

    /** Kasa hacmi (m³). */
    @Column(name = "volume_m3", nullable = false, precision = 8, scale = 2)
    private BigDecimal volumeM3;

    /** Taşıma kapasitesi (kg). */
    @Column(nullable = false)
    private Integer payloadKg;

    /**
     * Kasa iç uzunluğu (cm). Hacim yeterli olsa bile bu kısıt sağlanmazsa yük sığmaz —
     * 200 cm'lik bir yatak 170 cm'lik Doblo kasasına girmez.
     */
    @Column(nullable = false)
    private Integer innerLengthCm;

    private Integer innerWidthCm;
    private Integer innerHeightCm;

    @Column(columnDefinition = "text")
    private String exampleLoads;

    @Column(nullable = false)
    private Integer sortOrder;

    @Column(nullable = false)
    private boolean active;

    /** Bu araç, verilen hacim/ağırlık/uzunluk için fiziksel olarak uygun mu? */
    public boolean canCarry(BigDecimal volumeM3, int weightKg, int longestEdgeCm) {
        return this.volumeM3.compareTo(volumeM3) >= 0
                && this.payloadKg >= weightKg
                && this.innerLengthCm >= longestEdgeCm;
    }

    /** Yükün aracı yüzde kaç doldurduğu — öneri ekranındaki doluluk göstergesi. */
    public int fillRatePercent(BigDecimal volumeM3) {
        return volumeM3
                .multiply(BigDecimal.valueOf(100))
                .divide(this.volumeM3, 0, java.math.RoundingMode.HALF_UP)
                .intValue();
    }
}
