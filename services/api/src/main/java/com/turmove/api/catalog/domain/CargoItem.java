package com.turmove.api.catalog.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Eşya kataloğu kalemi. Öneri motorunun tahmin girdisi. */
@Entity
@Table(name = "cargo_items")
@Getter
@NoArgsConstructor
public class CargoItem {

    @Id
    @Column(length = 48)
    private String code;

    @Column(nullable = false, length = 32)
    private String categoryCode;

    @Column(nullable = false)
    private String displayName;

    @Column(name = "volume_m3", nullable = false, precision = 8, scale = 2)
    private BigDecimal volumeM3;

    @Column(nullable = false)
    private Integer weightKg;

    /** En uzun kenar (cm) — aracın kasa uzunluğuna karşı kontrol edilir. */
    @Column(nullable = false)
    private Integer longestEdgeCm;

    @Column(nullable = false)
    private Integer sortOrder;

    @Column(nullable = false)
    private boolean active;
}
