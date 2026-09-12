package com.tasiyoruz.api.finance.internal;

import com.tasiyoruz.api.finance.api.FinanceEnums.*;
import com.tasiyoruz.api.finance.api.InvoiceProvider;
import com.tasiyoruz.api.finance.api.PaymentProvider;
import com.tasiyoruz.api.finance.api.PayoutProvider;
import com.tasiyoruz.api.pricing.api.Money;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Sağlayıcı bağlı değilken kullanılan sahte uygulamalar.
 *
 * <p><strong>Gerçek para hareketi üretmiyorlar</strong> ve bunu saklamıyorlar:
 * {@code live()} false, {@code official()} false dönüyor ve arayüz bu bayrağa
 * bakıp "demo" uyarısını gösteriyor. Sahte bir ödemeyi gerçekmiş gibi göstermek,
 * kullanıcıyı parasının hareket ettiğine inandırmak olurdu.
 *
 * <p>Yapılandırmayla değişiyor: {@code karinca.payment.mode=mock} (varsayılan).
 * Gerçek sağlayıcı bağlandığında bu sınıflar devre dışı kalacak, çağıran kod
 * değişmeyecek.
 */
@Component
@ConditionalOnProperty(name = "karinca.payment.mode", havingValue = "mock", matchIfMissing = true)
class MockPaymentProvider implements PaymentProvider {

    private final Map<String, PaymentIntent> kayitlar = new ConcurrentHashMap<>();

    @Override public String name() { return "mock"; }

    @Override public boolean live() { return false; }

    @Override
    public PaymentIntent createPayment(String listingId, Money amount, String customerId) {
        var ref = "mock_pay_" + UUID.randomUUID();
        var intent = new PaymentIntent(ref, TransactionStatus.PENDING, amount, listingId);
        kayitlar.put(ref, intent);
        return intent;
    }

    @Override public Optional<PaymentIntent> getPayment(String ref) {
        return Optional.ofNullable(kayitlar.get(ref));
    }

    @Override public PaymentIntent capturePayment(String ref) {
        return guncelle(ref, TransactionStatus.CAPTURED);
    }

    @Override public PaymentIntent cancelPayment(String ref, String reason) {
        return guncelle(ref, TransactionStatus.CANCELLED);
    }

    @Override public PaymentIntent refundPayment(String ref, Money amount, String reason) {
        return guncelle(ref, TransactionStatus.REFUNDED);
    }

    /**
     * Sahte sağlayıcıda imza doğrulanamaz ve doğrulanmış GİBİ davranmıyoruz:
     * her zaman false. Gerçek sağlayıcı bağlanana kadar geri bildirim ucu
     * güvenilir sayılmamalı.
     */
    @Override public boolean verifyCallback(String payload, String signature) {
        return false;
    }

    private PaymentIntent guncelle(String ref, TransactionStatus durum) {
        var mevcut = kayitlar.get(ref);
        if (mevcut == null) throw FinanceExceptions.notFound("Ödeme kaydı bulunamadı.");
        var yeni = new PaymentIntent(ref, durum, mevcut.amount(), mevcut.listingId());
        kayitlar.put(ref, yeni);
        return yeni;
    }
}

@Component
@ConditionalOnProperty(name = "karinca.payment.mode", havingValue = "mock", matchIfMissing = true)
class MockPayoutProvider implements PayoutProvider {

    private final Map<String, PayoutTicket> kayitlar = new ConcurrentHashMap<>();

    @Override public String name() { return "mock"; }

    @Override public boolean live() { return false; }

    @Override
    public PayoutTicket createPayout(String payoutId, String carrierId, Money net) {
        var ref = "mock_payout_" + payoutId;
        // PAID değil: sahte sağlayıcı parayı göndermiş gibi yapmıyor
        var ticket = new PayoutTicket(ref, PayoutStatus.PROCESSING, net);
        kayitlar.put(ref, ticket);
        return ticket;
    }

    @Override public Optional<PayoutTicket> getPayout(String ref) {
        return Optional.ofNullable(kayitlar.get(ref));
    }

    @Override public PayoutTicket cancelPayout(String ref, String reason) {
        var mevcut = kayitlar.get(ref);
        if (mevcut == null) throw FinanceExceptions.notFound("Hakediş kaydı bulunamadı.");
        var yeni = new PayoutTicket(ref, PayoutStatus.FAILED, mevcut.amount());
        kayitlar.put(ref, yeni);
        return yeni;
    }
}

@Component
@ConditionalOnProperty(name = "karinca.invoice.mode", havingValue = "mock", matchIfMissing = true)
class MockInvoiceProvider implements InvoiceProvider {

    private final Map<String, InvoiceDocument> kayitlar = new ConcurrentHashMap<>();
    private final AtomicLong sira = new AtomicLong(1);
    private final Clock clock;

    MockInvoiceProvider(Clock clock) {
        this.clock = clock;
    }

    @Override public String name() { return "mock"; }

    /** Resmî belge DEĞİL; üretilen kayıt demo işaretli. */
    @Override public boolean official() { return false; }

    @Override
    public InvoiceDocument createInvoice(InvoiceRequest request) {
        var yil = clock.instant().atZone(ZoneOffset.UTC).getYear();
        var numara = "KRN-%d-%06d".formatted(yil, sira.getAndIncrement());
        var toplam = Money.tryOf(request.subtotal().amount().add(request.taxAmount().amount()));
        // DRAFT: resmî bir belge kesilmedi, yalnızca hangi belgenin gerekeceği kaydedildi
        var belge = new InvoiceDocument(numara, InvoiceStatus.DRAFT, toplam, true, null);
        kayitlar.put(numara, belge);
        return belge;
    }

    @Override public Optional<InvoiceDocument> getInvoice(String numara) {
        return Optional.ofNullable(kayitlar.get(numara));
    }

    @Override public InvoiceDocument cancelInvoice(String numara, String reason) {
        var mevcut = kayitlar.get(numara);
        if (mevcut == null) throw FinanceExceptions.notFound("Fatura bulunamadı.");
        var yeni = new InvoiceDocument(numara, InvoiceStatus.CANCELLED, mevcut.totalAmount(), true, null);
        kayitlar.put(numara, yeni);
        return yeni;
    }
}
