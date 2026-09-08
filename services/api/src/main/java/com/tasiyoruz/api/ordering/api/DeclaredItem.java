package com.tasiyoruz.api.ordering.api;

import java.math.BigDecimal;

/**
 * İlana yazılmış yük kalemi.
 *
 * <p>Katalog kaydına atıf değil, kopya: kalemin adı ya da hacmi sonradan değişse bile
 * yayınlanmış ilanın beyanı olduğu gibi kalır. Araç sahibi teklifini bu satırlara
 * bakarak veriyor; altındaki sayıların sonradan kayması teklifi geçersiz kılardı.
 *
 * @param itemCode katalog kodu — yalnızca ikon ve gruplama için, doğruluk kaynağı değil
 */
public record DeclaredItem(
        String itemCode,
        String displayName,
        int quantity,
        BigDecimal volumeM3,
        int weightKg) {

    /** Bu satırın toplam hacmi (adet × birim). */
    public BigDecimal totalVolumeM3() {
        return volumeM3.multiply(BigDecimal.valueOf(quantity));
    }

    public int totalWeightKg() {
        return weightKg * quantity;
    }
}
