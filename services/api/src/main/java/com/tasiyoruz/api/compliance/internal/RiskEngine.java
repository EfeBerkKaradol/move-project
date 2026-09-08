package com.tasiyoruz.api.compliance.internal;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Basit, açıklanabilir bir risk skoru.
 *
 * <p>Skor bir karar değil, bir sıralama aracı: hangi işleme önce bakılacağını
 * söylüyor. Kimseyi otomatik olarak kısıtlamıyor, "suçlu" gibi bir çıktı üretmiyor.
 *
 * <p>Her katkı sinyal olarak dışarı veriliyor. Gerekçesini gösteremeyen bir skor,
 * inceleyene "sistem böyle dedi"den başka bir şey söylemez — ve yanlış pozitifi
 * fark etmeyi imkânsızlaştırır.
 *
 * <p>Ağırlıklar deneyime göre ayarlanacak; şu an kalibre edilmiş değiller ve
 * ürettikleri tek sonuç "incelensin" eşiğidir.
 */
@Component
class RiskEngine {

    /** Bu eşiğin üstü insan incelemesine açılıyor. */
    static final int REVIEW_THRESHOLD = 40;

    record Assessment(int score, Map<String, Object> signals) {
        boolean needsReview() {
            return score >= REVIEW_THRESHOLD;
        }
    }

    /**
     * @param prohibitedMatches yasaklı eşya taramasının bulguları
     * @param openReports       bu işleme açılmış bildirim sayısı
     * @param recentEvents      kullanıcının yakın geçmişteki uyum olayı sayısı
     */
    Assessment assess(java.util.Set<String> prohibitedMatches, long openReports, long recentEvents) {
        var signals = new LinkedHashMap<String, Object>();
        int score = 0;

        if (!prohibitedMatches.isEmpty()) {
            // Tek başına belirleyici değil: kelime eşleşmesi bağlamı bilmiyor
            score += 45;
            signals.put("prohibitedKeywords", String.join(", ", prohibitedMatches));
        }
        if (openReports > 0) {
            score += (int) Math.min(30, openReports * 15);
            signals.put("openReports", openReports);
        }
        if (recentEvents > 0) {
            score += (int) Math.min(25, recentEvents * 10);
            signals.put("recentComplianceEvents", recentEvents);
        }

        return new Assessment(Math.min(score, 100), signals);
    }
}
