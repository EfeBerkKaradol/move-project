package com.turmove.api.pricing.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "extra_services")
@Getter
@NoArgsConstructor
public class ExtraService {

    @Id
    @Column(length = 32)
    private String code;

    @Column(nullable = false)
    private String displayName;

    @Column(columnDefinition = "text")
    private String description;

    /** FIXED · PER_UNIT · PERCENT */
    @Column(nullable = false, length = 16)
    private String pricingType;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal rate;

    @Column(length = 32)
    private String unitLabel;

    @Column(nullable = false)
    private Integer sortOrder;

    @Column(nullable = false)
    private boolean active;
}
