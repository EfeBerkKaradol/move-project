package com.tasiyoruz.api.finance.internal;

import com.tasiyoruz.api.pricing.api.CommissionRates;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Component;

/**
 * Komisyon hesabının TEK yeri.
 *
 * <p>Oran hiçbir yere yazılı değil: {@code pricing} modülünün konfigürasyonundan
 * okunuyor (şehir, sürüm ve yürürlük tarihiyle birlikte). Kodun başka bir yerinde
 * 0.15 gibi bir sabit bulunmamalı — oran değiştiğinde tek bir kaydın değişmesi
 * yeterli olmalı.
 *
 * <p>Oran, hesaplandığı anda taşımanın özetine YAZILIYOR. Sonradan oran değişse
 * bile geçmiş iş kendi oranıyla kalıyor; fiyat anlık görüntüsünün değişmezliğiyle
 * aynı gerekçe.
 */
@Component
class CommissionEngine {

    private final CommissionRates rates;
    private final Clock clock;

    CommissionEngine(CommissionRates rates, Clock clock) {
        this.rates = rates;
        this.clock = clock;
    }

    /** Yürürlükteki oran, yüzde olarak (ör. 15.00). */
    BigDecimal rate() {
        return rates.commissionPercent(Instant.now(clock));
    }

    /** Brüt tutar üzerinden komisyon; kuruşa yuvarlanmış. */
    BigDecimal commissionOf(BigDecimal gross, BigDecimal ratePercent) {
        return gross.multiply(ratePercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    /**
     * Taşıyıcının hakedişi: brütten komisyon düşülür.
     *
     * <p>Vergi burada düşülmüyor. Komisyon üzerinden hesaplanan vergi platformun
     * yükümlülüğü; taşıyıcının hakedişini azaltmaz. İkisini karıştırmak taşıyıcıya
     * eksik ödeme yapmak olurdu.
     */
    BigDecimal payoutOf(BigDecimal gross, BigDecimal commission) {
        return gross.subtract(commission).setScale(2, RoundingMode.HALF_UP);
    }
}
