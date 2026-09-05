package com.tasiyoruz.api.catalog.internal;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Kategori bazlı sabit tahmin ("2+1, orta yoğunluk"). Eşya kataloğu toplamı yerine
 * bu tablo değeri kullanılır — kullanıcıya 40 eşyayı tek tek saydırmıyoruz.
 */
@Entity
@Table(name = "cargo_presets")
@Getter
@NoArgsConstructor
class CargoPreset {

    @Id
    @Column(length = 48)
    private String code;

    @Column(nullable = false, length = 32)
    private String categoryCode;

    @Column(nullable = false)
    private String displayName;

    @Column(name = "estimated_volume_m3", nullable = false, precision = 8, scale = 2)
    private BigDecimal estimatedVolumeM3;

    @Column(nullable = false)
    private Integer estimatedWeightKg;

    @Column(nullable = false)
    private Integer estimatedLongestEdgeCm;

    @Column(nullable = false)
    private Integer sortOrder;
}
