package com.turmove.api.pricing.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Platform komisyon oranı. Şu an %0 — komisyonsuz dönem 2027 ilk çeyreğine kadar.
 *
 * <p>Oran sıfır olsa bile fiyat dökümünde satır olarak görünür (FR-5.8): kullanıcı
 * komisyon alınmadığını görürse, ileride alınmaya başladığında sürpriz olmaz.
 */
@Entity
@Table(name = "platform_commission")
@Getter
@NoArgsConstructor
public class PlatformCommission {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(length = 8)
    private String cityCode;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal percent;

    @Column(nullable = false)
    private Integer version;

    @Column(nullable = false)
    private Instant validFrom;

    private Instant validTo;

    private Instant announcementSentAt;
}
