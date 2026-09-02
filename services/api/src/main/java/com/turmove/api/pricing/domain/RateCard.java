package com.turmove.api.pricing.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Birim fiyat kartı. {@code carrierId} doluysa firmaya özel sözleşme fiyatı,
 * boşsa şehir varsayılan tarifesi.
 *
 * <p>Versiyonlu: tarife değişse bile geçmiş siparişlerin fiyatı yeniden hesaplanmaz.
 */
@Entity
@Table(name = "rate_cards")
@Getter
@NoArgsConstructor
public class RateCard {

    @Id
    @GeneratedValue
    private UUID id;

    private UUID carrierId;

    @Column(nullable = false, length = 8)
    private String cityCode;

    @Column(nullable = false, length = 32)
    private String vehicleTypeCode;

    @Column(nullable = false, length = 16)
    private String serviceModel;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal baseFare;

    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal includedKm;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal perKmRate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal perMinuteRate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal minimumFare;

    @Column(nullable = false)
    private Integer waitingFreeMinutes;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal waitingPerMinuteRate;

    /** Kademeli km ücreti — Hatay gibi il içi mesafeleri uzun şehirler için. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private java.util.List<DistanceTier> distanceTiers;

    @Column(nullable = false)
    private Integer version;

    @Column(nullable = false)
    private Instant validFrom;

    private Instant validTo;

    @Column(nullable = false)
    private boolean active;

    /** @param toKm null ise üst sınırsız kademe */
    public record DistanceTier(BigDecimal fromKm, BigDecimal toKm, BigDecimal factor) {}
}
