package com.tasiyoruz.api.finance.internal;

import com.tasiyoruz.api.finance.api.FinanceEnums.PayoutStatus;
import com.tasiyoruz.api.finance.api.FinanceEnums.TaxBase;
import com.tasiyoruz.api.finance.domain.*;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Finans depoları tek dosyada: hepsi dar ve birbirine bakarak okunuyor. */
final class Repositories {
    private Repositories() {}
}

interface ShipmentFinanceRepository extends JpaRepository<ShipmentFinance, UUID> {
    Optional<ShipmentFinance> findByListingId(UUID listingId);
    List<ShipmentFinance> findByCarrierIdOrderByCreatedAtDesc(String carrierId);
}

interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, UUID> {
    List<FinancialTransaction> findByListingIdOrderByCreatedAtAsc(UUID listingId);
    List<FinancialTransaction> findAllByOrderByCreatedAtDesc(Limit limit);
}

interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {
    List<LedgerEntry> findByTransactionIdIn(List<UUID> transactionIds);
}

interface PayoutRepository extends JpaRepository<Payout, UUID> {
    Optional<Payout> findByListingId(UUID listingId);
    List<Payout> findByCarrierIdOrderByCreatedAtDesc(String carrierId);
    List<Payout> findByStatusOrderByCreatedAtAsc(PayoutStatus status);
}

interface TaxRuleRepository extends JpaRepository<TaxRule, UUID> {

    /**
     * Belirtilen anda yürürlükte olan kural. Birden çok kural varsa en yenisi —
     * eski kural kapatılmadan yenisi girilmişse doğru cevap yürürlüğe en son
     * girendir.
     */
    @Query("""
            SELECT r FROM TaxRule r
            WHERE r.appliesTo = :base AND r.validFrom <= :at
              AND (r.validTo IS NULL OR r.validTo > :at)
            ORDER BY r.validFrom DESC
            """)
    List<TaxRule> findActive(@Param("base") TaxBase base, @Param("at") Instant at, Limit limit);
}
