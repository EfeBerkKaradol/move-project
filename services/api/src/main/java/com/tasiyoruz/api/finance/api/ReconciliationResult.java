package com.tasiyoruz.api.finance.api;

import java.math.BigDecimal;
import java.util.List;

/**
 * Mutabakat sonucu.
 *
 * <p>İki şey ayrı ayrı kontrol ediliyor:
 * <ol>
 *   <li><strong>Defter dengesi:</strong> her hareketin borç ve alacak toplamı eşit mi?</li>
 *   <li><strong>Özet tutarlılığı:</strong> saklanan özet, hareketlerden yeniden
 *       hesaplananla aynı mı?</li>
 * </ol>
 *
 * <p>Uyumsuzluk sessizce geçilmiyor: sorun listesi boş değilse iş dengesiz sayılıyor
 * ve yönetim ekranında işaretleniyor.
 */
public record ReconciliationResult(
        String listingId,
        boolean balanced,
        BigDecimal ledgerDebit,
        BigDecimal ledgerCredit,
        List<String> problems) {

    public static ReconciliationResult ok(String listingId, BigDecimal debit, BigDecimal credit) {
        return new ReconciliationResult(listingId, true, debit, credit, List.of());
    }
}
