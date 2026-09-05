package com.tasiyoruz.api.shared;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.pricing.api.Money;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Para değerleri JSON'a string olarak yazılmalı.
 *
 * <p>Sayı olarak gönderilirse JavaScript tarafında IEEE-754 float'a dönüşür ve
 * kuruş kaybı yaşanır. API sözleşmesi de string diyor (docs/05).
 */
class MoneySerializationTest extends IntegrationTestBase {

    @Autowired ObjectMapper mapper;

    @Test
    void paraDegeriStringOlarakYazilir() throws Exception {
        var json = mapper.writeValueAsString(Money.tryOf(new BigDecimal("644.98")));

        assertThat(json).contains("\"amount\":\"644.98\"");
        assertThat(json).doesNotContain("\"amount\":644.98");
    }

    @Test
    void kurusHassasiyetiKorunur() throws Exception {
        var json = mapper.writeValueAsString(Money.tryOf(new BigDecimal("0.10")));

        assertThat(json).contains("\"amount\":\"0.10\"");
    }
}
