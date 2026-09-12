package com.tasiyoruz.api.finance.internal;

import com.tasiyoruz.api.finance.api.FinanceEnums.TaxBase;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Component;

/**
 * Vergi hesabının TEK yeri.
 *
 * <p>Oran veritabanındaki yürürlükteki kuraldan okunuyor; kodda oran yok ve
 * "en düşük oranı seç" gibi bir seçim de yok.
 *
 * <p><strong>Kapsam:</strong> yalnızca platformun komisyonu üzerinden hesaplanan
 * vergi. Taşıma bedelinin vergisel niteliği taşıyıcının kendi mükellefiyetine
 * bağlı ve platform onu varsayamaz — o kural tanımlanmadıkça sıfır dönüyor,
 * uydurulmuyor.
 */
@Component
class TaxEngine {

    private final TaxRuleRepository rules;
    private final Clock clock;

    TaxEngine(TaxRuleRepository rules, Clock clock) {
        this.rules = rules;
        this.clock = clock;
    }

    /** Yürürlükteki oran, yüzde olarak; kural yoksa sıfır. */
    BigDecimal ratePercent(TaxBase base) {
        return rules.findActive(base, Instant.now(clock), Limit.of(1)).stream()
                .findFirst()
                .map(r -> r.getRatePercent())
                .orElse(BigDecimal.ZERO);
    }

    BigDecimal taxOn(BigDecimal matrah, TaxBase base) {
        return matrah.multiply(ratePercent(base))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
