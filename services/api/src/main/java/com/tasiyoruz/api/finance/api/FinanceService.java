package com.tasiyoruz.api.finance.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.util.List;
import java.util.Optional;

/** Finans modülünün dışa açık yüzü. */
public interface FinanceService {

    /**
     * İş verildiğinde taşımanın finansal özetini açar ve brüt hareketi yazar.
     *
     * <p>Aynı ilan için ikinci çağrı yok sayılıyor: olay en az bir kez teslim
     * edilir ve mükerrer çağrı ikinci bir brüt kayıt üretirse ciro iki katına
     * çıkmış görünür.
     */
    ShipmentFinanceView openForAward(String listingId, String shipperId, String carrierId, Money gross);

    /** Taşıma tamamlandığında hakediş ödenebilir hâle geliyor. */
    void markDelivered(String listingId, String tripId);

    Optional<ShipmentFinanceView> shipmentFinance(String listingId);

    /** Taşıyıcının hakedişleri; yalnızca kendisi ve finans yetkilisi görebiliyor. */
    List<PayoutView> payoutsOfCarrier(String carrierId);

    /** Bir taşımanın bütün para hareketleri, eskiden yeniye. */
    List<TransactionView> transactions(String listingId);

    /**
     * İadeyi kaydeder. Brüt tutar DEĞİŞMEZ — iade ayrı bir olaydır; işlem hacmini
     * geriye dönük silmek olanı olmamış gibi göstermek olurdu.
     */
    ShipmentFinanceView recordRefund(String listingId, Money amount, String reason, String actor);

    /** Matematiksel tutarlılık kontrolü; uyumsuzluk sessizce geçilmiyor. */
    ReconciliationResult reconcile(String listingId);

    /** Yönetim özeti: ciro ile platform geliri ayrı ayrı. */
    FinanceSummary summary();

    record PayoutView(
            String id, String listingId, String carrierId,
            Money gross, Money commission, Money net,
            FinanceEnums.PayoutStatus status) {}

    record TransactionView(
            String id, FinanceEnums.TransactionType type, FinanceEnums.TransactionDirection direction,
            Money amount, FinanceEnums.TransactionStatus status, String occurredAt) {}

    /**
     * Yönetim özeti.
     *
     * <p>{@code gmv} platform üzerinden geçen toplam işlem hacmi; {@code
     * platformRevenue} ise Karınca'nın geliri. Bu ikisi aynı sayı DEĞİL ve
     * arayüzde de ayrı gösteriliyor.
     */
    record FinanceSummary(
            Money gmv,
            Money platformRevenue,
            Money carrierPayable,
            Money refunds,
            Money paymentFees,
            Money commissionTax,
            int shipmentCount,
            int pendingPayouts,
            int eligiblePayouts,
            /** Mutabakatı bozuk taşıma sayısı; sıfır olmalı. */
            int unbalanced) {}
}
