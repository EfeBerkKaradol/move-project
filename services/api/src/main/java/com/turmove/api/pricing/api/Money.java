package com.turmove.api.pricing.api;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Para değeri. Kuruş kaybı olmaması için {@link BigDecimal}, asla double. */
public record Money(BigDecimal amount, String currency) {

    public static final String TRY = "TRY";

    public static Money tryOf(BigDecimal amount) {
        return new Money(amount.setScale(2, RoundingMode.HALF_UP), TRY);
    }

    public static Money zero() {
        return tryOf(BigDecimal.ZERO);
    }

    public Money plus(Money other) {
        return tryOf(this.amount.add(other.amount));
    }
}
