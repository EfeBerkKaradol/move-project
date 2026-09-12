package com.tasiyoruz.api.finance.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.util.Optional;

/**
 * Hakediş ödemesinin dar yüzü. Banka/IBAN bilgisi bu modülde tutulmuyor;
 * sağlayıcı tarafındaki alıcı kaydının kimliği taşınıyor.
 */
public interface PayoutProvider {

    String name();

    boolean live();

    PayoutTicket createPayout(String payoutId, String carrierId, Money net);

    Optional<PayoutTicket> getPayout(String providerReference);

    PayoutTicket cancelPayout(String providerReference, String reason);

    record PayoutTicket(
            String providerReference, FinanceEnums.PayoutStatus status, Money amount) {}
}
