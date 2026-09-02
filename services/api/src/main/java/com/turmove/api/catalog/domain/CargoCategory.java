package com.turmove.api.catalog.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * "Ne taşımak istiyorsunuz?" panelindeki yük kategorisi. Kartlar küçükten büyüğe
 * sıralanır ve her biri somut bir ölçek referansı taşır (bkz. docs/08).
 */
@Entity
@Table(name = "cargo_categories")
@Getter
@NoArgsConstructor
public class CargoCategory {

    @Id
    @Column(length = 32)
    private String code;

    @Column(nullable = false)
    private String displayName;

    /** "Sırt çantasına sığar" gibi somut ölçek ipucu — m³ değerinden çok daha anlaşılır. */
    @Column(nullable = false)
    private String scaleHint;

    @Column(name = "typical_volume_min_m3", precision = 8, scale = 2)
    private BigDecimal typicalVolumeMinM3;

    @Column(name = "typical_volume_max_m3", precision = 8, scale = 2)
    private BigDecimal typicalVolumeMaxM3;

    @Column(length = 32)
    private String defaultVehicleTypeCode;

    /** "Kaç paket?" cevabının hangi eşya kalemiyle hesaplanacağı. Zarf ile taşınma kolisi
     *  aynı hacimde değil; bu yüzden paket boyutu kategoriye bağlı. */
    @Column(length = 48)
    private String defaultPackageItemCode;

    /** İkinci adımda hangi detay formunun açılacağını belirler. */
    @Column(nullable = false, length = 32)
    private String detailFormType;

    @Column(nullable = false)
    private Integer sortOrder;

    @Column(nullable = false)
    private boolean active;
}
