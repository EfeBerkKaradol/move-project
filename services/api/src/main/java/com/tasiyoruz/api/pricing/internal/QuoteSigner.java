package com.tasiyoruz.api.pricing.internal;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Teklifi HMAC ile imzalar.
 *
 * <p>Amaç: istemcinin fiyatı değiştirip sipariş oluşturmasını engellemek. Sipariş
 * oluşturulurken imza yeniden hesaplanıp karşılaştırılır; tutmuyorsa istek reddedilir.
 */
@Component
class QuoteSigner {

    private static final String ALGORITHM = "HmacSHA256";

    private final byte[] secret;

    QuoteSigner(@Value("${tasiyoruz.quote.signing-secret:local-development-secret}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    String sign(String quoteId, BigDecimal totalAmount, Instant expiresAt) {
        var payload = "%s|%s|%s".formatted(quoteId, totalAmount.toPlainString(), expiresAt.toString());
        try {
            var mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secret, ALGORITHM));
            return "v1:" + Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Teklif imzalanamadı", e);
        }
    }
}
