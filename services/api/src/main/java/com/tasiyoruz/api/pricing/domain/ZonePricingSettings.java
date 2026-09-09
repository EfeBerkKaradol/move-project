package com.tasiyoruz.api.pricing.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Şehrin kısa/uzun rota eşiği (V22). Tarife satırında değil şehirde duruyor:
 * eşik hangi satırın seçileceğini belirliyor, satırın içinde olsaydı satırlar
 * birbiriyle çelişebilirdi.
 */
@Entity
@Table(name = "zone_pricing_settings")
@Getter
@NoArgsConstructor
public class ZonePricingSettings {

    @Id
    @Column(length = 8)
    private String cityCode;

    @Column(nullable = false)
    private BigDecimal shortDistanceKm;
}
