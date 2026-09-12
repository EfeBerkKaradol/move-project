package com.tasiyoruz.api.finance.internal;

import com.tasiyoruz.api.finance.api.FinanceEnums.*;
import com.tasiyoruz.api.finance.api.FinanceService;
import com.tasiyoruz.api.finance.api.ReconciliationResult;
import com.tasiyoruz.api.finance.api.ShipmentFinanceView;
import com.tasiyoruz.api.finance.domain.*;
import com.tasiyoruz.api.pricing.api.Money;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Finansın merkezi.
 *
 * <p><strong>Değişmez defter.</strong> Hiçbir hareket silinmiyor ve tutarı
 * değiştirilmiyor; düzeltme ters kayıtla yapılıyor. Özet tablosu hareketlerden
 * türetilebilir olduğu hâlde ayrıca saklanıyor — mutabakat tam da ikisini
 * karşılaştırarak çalışıyor.
 *
 * <p><strong>Çift taraflı kayıt.</strong> Her hareket borç ve alacak satırları
 * üretiyor ve toplamları eşit olmak zorunda. Eşit değilse mutabakat bunu
 * yakalıyor.
 */
@Service
@Transactional
class DefaultFinanceService implements FinanceService {

    private final ShipmentFinanceRepository finances;
    private final FinancialTransactionRepository transactions;
    private final LedgerEntryRepository entries;
    private final PayoutRepository payouts;
    private final CommissionEngine commissions;
    private final TaxEngine taxes;
    private final FinanceAudit audit;
    private final Clock clock;

    DefaultFinanceService(ShipmentFinanceRepository finances, FinancialTransactionRepository transactions,
                          LedgerEntryRepository entries, PayoutRepository payouts,
                          CommissionEngine commissions, TaxEngine taxes, FinanceAudit audit, Clock clock) {
        this.finances = finances; this.transactions = transactions; this.entries = entries;
        this.payouts = payouts; this.commissions = commissions; this.taxes = taxes;
        this.audit = audit; this.clock = clock;
    }

    @Override
    public ShipmentFinanceView openForAward(String listingId, String shipperId, String carrierId, Money gross) {
        var lid = UUID.fromString(listingId);
        // Olay en az bir kez teslim edilir; ikinci teslimat ciroyu iki katına çıkarmamalı
        var mevcut = finances.findByListingId(lid);
        if (mevcut.isPresent()) return view(mevcut.get());

        var now = Instant.now(clock);
        var rate = commissions.rate();
        var commission = commissions.commissionOf(gross.amount(), rate);
        var commissionTax = taxes.taxOn(commission, TaxBase.PLATFORM_COMMISSION);
        var payout = commissions.payoutOf(gross.amount(), commission);

        var finance = finances.save(ShipmentFinance.of(
                lid, shipperId, carrierId, gross.amount(), rate, commission, commissionTax, payout, now));

        /*
         * Brüt işlem: müşteriden platforma. Karşı tarafı İKİ hesaba bölünüyor —
         * taşıyıcıya borç ve platformun komisyon geliri. Tek satır yazılsaydı
         * "10.000 TL gelir elde edildi" gibi okunurdu; oysa platformun geliri
         * yalnızca komisyon.
         */
        var brut = kaydet(lid, shipperId, carrierId, TransactionType.GROSS_SHIPMENT,
                TransactionDirection.CUSTOMER_TO_PLATFORM, gross.amount(), TransactionStatus.PENDING, now);
        satir(LedgerEntry.debit(brut.getId(), LedgerAccount.CUSTOMER_FUNDS, gross.amount(), now));
        satir(LedgerEntry.credit(brut.getId(), LedgerAccount.CARRIER_PAYABLE, payout, now));
        satir(LedgerEntry.credit(brut.getId(), LedgerAccount.PLATFORM_COMMISSION_REVENUE, commission, now));

        // Komisyon geliri ayrı bir hareket olarak da görünür: yönetim ekranı
        // "platform geliri" sorusunu defterden tek tipte okuyabilsin
        if (commission.signum() > 0) {
            kaydet(lid, shipperId, carrierId, TransactionType.PLATFORM_COMMISSION,
                    TransactionDirection.PLATFORM_REVENUE, commission, TransactionStatus.PENDING, now);
        }
        if (commissionTax.signum() > 0) {
            var vergi = kaydet(lid, shipperId, carrierId, TransactionType.COMMISSION_TAX,
                    TransactionDirection.TAX, commissionTax, TransactionStatus.PENDING, now);
            satir(LedgerEntry.debit(vergi.getId(), LedgerAccount.PLATFORM_COMMISSION_REVENUE, commissionTax, now));
            satir(LedgerEntry.credit(vergi.getId(), LedgerAccount.TAX_PAYABLE, commissionTax, now));
        }

        // Hakediş açılıyor ama ÖDENEBİLİR değil: iş daha teslim edilmedi
        payouts.save(Payout.pending(lid, carrierId, gross.amount(), commission, payout, now));

        audit.kaydet("system", "SHIPMENT_FINANCE_OPENED", "ShipmentFinance", listingId, null,
                "gross=" + gross.amount() + " rate=" + rate + " payout=" + payout);
        return view(finance);
    }

    @Override
    public void markDelivered(String listingId, String tripId) {
        var lid = UUID.fromString(listingId);
        var now = Instant.now(clock);
        finances.findByListingId(lid).ifPresent(f -> f.attachTrip(UUID.fromString(tripId), now));
        payouts.findByListingId(lid).ifPresent(p -> {
            // Zaten ödenmiş/işlemdeki hakedişi geri almıyoruz
            if (p.getStatus() == PayoutStatus.PENDING) {
                p.markEligible(UUID.fromString(tripId), now);
                audit.kaydet("system", "PAYOUT_ELIGIBLE", "Payout", p.getId().toString(),
                        "PENDING", "ELIGIBLE");
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ShipmentFinanceView> shipmentFinance(String listingId) {
        return finances.findByListingId(UUID.fromString(listingId)).map(this::view);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PayoutView> payoutsOfCarrier(String carrierId) {
        return payouts.findByCarrierIdOrderByCreatedAtDesc(carrierId).stream()
                .map(p -> new PayoutView(p.getId().toString(), p.getListingId().toString(), p.getCarrierId(),
                        Money.tryOf(p.getGross()), Money.tryOf(p.getCommission()), Money.tryOf(p.getNet()),
                        p.getStatus()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionView> transactions(String listingId) {
        return transactions.findByListingIdOrderByCreatedAtAsc(UUID.fromString(listingId)).stream()
                .map(t -> new TransactionView(t.getId().toString(), t.getType(), t.getDirection(),
                        Money.tryOf(t.getAmount()), t.getStatus(), t.getCreatedAt().toString()))
                .toList();
    }

    @Override
    public ShipmentFinanceView recordRefund(String listingId, Money amount, String reason, String actor) {
        var lid = UUID.fromString(listingId);
        var finance = finances.findByListingId(lid)
                .orElseThrow(() -> FinanceExceptions.notFound("Taşımanın finansal kaydı yok."));
        var now = Instant.now(clock);

        var kalan = finance.getGrossAmount().subtract(finance.getRefundAmount());
        if (amount.amount().compareTo(kalan) > 0) {
            throw FinanceExceptions.badRequest("İade tutarı kalan tutarı aşamaz.");
        }

        finance.recordRefund(amount.amount(), now);
        var iade = kaydet(lid, finance.getShipperId(), finance.getCarrierId(), TransactionType.REFUND,
                TransactionDirection.REFUND_TO_CUSTOMER, amount.amount(), TransactionStatus.PENDING, now);
        satir(LedgerEntry.debit(iade.getId(), LedgerAccount.REFUNDS_PAID, amount.amount(), now));
        satir(LedgerEntry.credit(iade.getId(), LedgerAccount.CUSTOMER_FUNDS, amount.amount(), now));

        // İade sonrası hakediş askıya alınıyor: taşıyıcıya ödenecek tutar
        // yeniden değerlendirilmeli, sessizce ödenmemeli
        payouts.findByListingId(lid).ifPresent(p -> {
            if (p.getStatus() == PayoutStatus.PENDING || p.getStatus() == PayoutStatus.ELIGIBLE) {
                p.hold(now);
            }
        });

        audit.kaydet(actor, "REFUND_RECORDED", "ShipmentFinance", listingId, null,
                "amount=" + amount.amount() + " reason=" + reason);
        return view(finance);
    }

    @Override
    @Transactional(readOnly = true)
    public ReconciliationResult reconcile(String listingId) {
        var lid = UUID.fromString(listingId);
        var finance = finances.findByListingId(lid).orElse(null);
        if (finance == null) {
            return new ReconciliationResult(listingId, false, BigDecimal.ZERO, BigDecimal.ZERO,
                    List.of("Taşımanın finansal kaydı yok."));
        }
        var txns = transactions.findByListingIdOrderByCreatedAtAsc(lid);
        var ids = txns.stream().map(FinancialTransaction::getId).toList();
        var satirlar = ids.isEmpty() ? List.<LedgerEntry>of() : entries.findByTransactionIdIn(ids);

        var borc = satirlar.stream().map(LedgerEntry::getDebit).reduce(BigDecimal.ZERO, BigDecimal::add);
        var alacak = satirlar.stream().map(LedgerEntry::getCredit).reduce(BigDecimal.ZERO, BigDecimal::add);

        var sorunlar = new ArrayList<String>();
        // 1) Defter dengesi
        if (borc.compareTo(alacak) != 0) {
            sorunlar.add("Defter dengesiz: borç " + borc + " ≠ alacak " + alacak);
        }
        // 2) Özet tutarlılığı — komisyon + hakediş brütü vermeli
        var toplam = finance.getCommissionAmount().add(finance.getCarrierPayout());
        if (toplam.compareTo(finance.getGrossAmount()) != 0) {
            sorunlar.add("Komisyon + hakediş brütü tutmuyor: " + toplam + " ≠ " + finance.getGrossAmount());
        }
        // 3) Negatif hakediş bir hesap hatasıdır
        if (finance.getCarrierPayout().signum() < 0) {
            sorunlar.add("Hakediş negatif: " + finance.getCarrierPayout());
        }
        // 4) İade brütü aşamaz
        if (finance.getRefundAmount().compareTo(finance.getGrossAmount()) > 0) {
            sorunlar.add("İade brütü aşıyor: " + finance.getRefundAmount());
        }
        return new ReconciliationResult(listingId, sorunlar.isEmpty(), borc, alacak, List.copyOf(sorunlar));
    }

    @Override
    @Transactional(readOnly = true)
    public FinanceSummary summary() {
        var hepsi = finances.findAll();
        var gmv = topla(hepsi, ShipmentFinance::getGrossAmount);
        var gelir = topla(hepsi, ShipmentFinance::getCommissionAmount);
        var borc = topla(hepsi, ShipmentFinance::getCarrierPayout);
        var iade = topla(hepsi, ShipmentFinance::getRefundAmount);
        var ucret = topla(hepsi, ShipmentFinance::getPaymentFee);
        var vergi = topla(hepsi, ShipmentFinance::getCommissionTax);

        var bekleyen = (int) payouts.findByStatusOrderByCreatedAtAsc(PayoutStatus.PENDING).stream().count();
        var odenebilir = (int) payouts.findByStatusOrderByCreatedAtAsc(PayoutStatus.ELIGIBLE).stream().count();
        // Tutarsızlık sessizce geçilmiyor: yönetim ekranı sayıyı görüyor
        var bozuk = (int) hepsi.stream()
                .filter(f -> !reconcile(f.getListingId().toString()).balanced())
                .count();

        return new FinanceSummary(Money.tryOf(gmv), Money.tryOf(gelir), Money.tryOf(borc),
                Money.tryOf(iade), Money.tryOf(ucret), Money.tryOf(vergi),
                hepsi.size(), bekleyen, odenebilir, bozuk);
    }

    // ── yardımcılar ──────────────────────────────────────────────────────

    private static BigDecimal topla(List<ShipmentFinance> l,
                                    java.util.function.Function<ShipmentFinance, BigDecimal> f) {
        return l.stream().map(f).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private FinancialTransaction kaydet(UUID listingId, String shipperId, String carrierId,
                                        TransactionType type, TransactionDirection direction,
                                        BigDecimal amount, TransactionStatus status, Instant now) {
        return transactions.save(FinancialTransaction.of(
                listingId, shipperId, carrierId, type, direction, amount, status, now));
    }

    private void satir(LedgerEntry entry) {
        entries.save(entry);
    }

    private ShipmentFinanceView view(ShipmentFinance f) {
        return new ShipmentFinanceView(
                f.getListingId().toString(),
                f.getTripId() == null ? null : f.getTripId().toString(),
                f.getShipperId(), f.getCarrierId(),
                Money.tryOf(f.getGrossAmount()), f.getCommissionRate(),
                Money.tryOf(f.getCommissionAmount()), Money.tryOf(f.getCommissionTax()),
                Money.tryOf(f.getPaymentFee()), Money.tryOf(f.getRefundAmount()),
                Money.tryOf(f.getCancellationFee()), Money.tryOf(f.getCarrierPayout()),
                Money.tryOf(f.getPlatformRevenue()));
    }
}
