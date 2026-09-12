package com.tasiyoruz.api.finance.domain;

import com.tasiyoruz.api.finance.api.FinanceEnums.TaxBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Yürürlükteki vergi kuralı.
 *
 * <p>Oran koda yazılmıyor. Hangi oranın hangi kaleme, hangi tarihten itibaren
 * uygulanacağı burada tanımlı; kod yalnızca okuyor. "En düşük oranı seç" gibi bir
 * davranış yok — yürürlükte olan kural neyse o uygulanıyor.
 */
@Entity
@Table(name = "tax_rules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TaxRule {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, length = 32) private String code;
    @Enumerated(EnumType.STRING) @Column(name = "applies_to", nullable = false, length = 32)
    private TaxBase appliesTo;
    @Column(name = "rate_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal ratePercent;
    @Column(nullable = false, length = 8) private String jurisdiction;
    @Column(nullable = false) private Instant validFrom;
    private Instant validTo;
}
