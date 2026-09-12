package com.tasiyoruz.api.pricing.api;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Yürürlükteki platform komisyon oranının dışa açık yüzü.
 *
 * <p>Finans modülü hakedişi hesaplarken oranı bilmek zorunda ama tarifenin
 * tamamını değil. {@link PricingService} açılsaydı finans modülü fiyat da
 * hesaplayabilir hâle gelirdi; oranın tek kaynağı yine burası kalsın diye yüz
 * bu kadar dar.
 */
public interface CommissionRates {

    /**
     * @param at oranın hangi ana göre okunacağı; geçmiş bir iş kendi dönemindeki
     *           oranla kalmalı
     * @return yüzde olarak oran (ör. 15.00); tanımlı oran yoksa sıfır
     */
    BigDecimal commissionPercent(Instant at);
}
