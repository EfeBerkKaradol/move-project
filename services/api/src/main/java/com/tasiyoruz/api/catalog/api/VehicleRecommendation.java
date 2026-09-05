package com.tasiyoruz.api.catalog.api;

import java.math.BigDecimal;
import java.util.List;

/** Araç öneri motorunun çıktısı (bkz. docs/08, ADR-0007). */
public record VehicleRecommendation(
        Estimate estimate,
        Option primary,
        List<Option> alternatives,
        List<SuggestedExtra> suggestedExtras) {

    public record Estimate(BigDecimal volumeM3, int weightKg, int longestEdgeCm) {}

    /**
     * @param whyNotSmaller bir alt aracın neden yetmediği. Kullanıcı bunu görmezse
     *                      daha ucuzunu seçer ve iş bozulur.
     */
    public record Option(
            String vehicleTypeCode,
            String displayName,
            int fillRatePercent,
            String reason,
            WhyNotSmaller whyNotSmaller) {}

    public record WhyNotSmaller(String vehicleTypeCode, String reason) {}

    public record SuggestedExtra(String code, String reason) {}
}
