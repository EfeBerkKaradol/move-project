package com.tasiyoruz.api.pricing.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Para değeri.
 *
 * <p>{@link BigDecimal} kullanılır, asla {@code double}. JSON'a da <strong>string</strong>
 * olarak yazılır: sayı olarak gönderilseydi JavaScript tarafında IEEE-754 float'a
 * dönüşüp kuruş kaybı yaşanırdı. API sözleşmesi de string diyor (docs/05).
 */
public record Money(
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount, String currency) {

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
