package com.tasiyoruz.api.finance.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.util.Optional;

/**
 * Ödeme sağlayıcısının dar yüzü.
 *
 * <p>Uygulama kodu hiçbir yerde sağlayıcıya özel bir çağrı yapmıyor; yalnızca bu
 * arayüzü tanıyor. İleride bir sağlayıcı bağlandığında yazılacak tek şey bu
 * arayüzün bir uygulaması olacak — çağıran taraflar değişmeyecek.
 *
 * <p><strong>Kart verisi bizde durmaz.</strong> Arayüz yalnızca sağlayıcı tarafındaki
 * kaydın kimliğini ({@code providerReference}) taşıyor.
 */
public interface PaymentProvider {

    /** Hangi sağlayıcı çalışıyor — arayüzde "demo" uyarısı bunu okuyor. */
    String name();

    /** Gerçek para hareketi üretebiliyor mu? Sahte sağlayıcıda false. */
    boolean live();

    PaymentIntent createPayment(String listingId, Money amount, String customerId);

    Optional<PaymentIntent> getPayment(String providerReference);

    PaymentIntent capturePayment(String providerReference);

    PaymentIntent cancelPayment(String providerReference, String reason);

    PaymentIntent refundPayment(String providerReference, Money amount, String reason);

    /**
     * Sağlayıcıdan gelen bildirimin gerçekliğini doğrular.
     *
     * <p>Aynı bildirimin iki kez gelmesi normal; çağıran taraf bunu kayıt
     * kimliğiyle tekilleştiriyor (bkz. FinanceService).
     */
    boolean verifyCallback(String payload, String signature);

    /**
     * @param providerReference sağlayıcıdaki kaydın kimliği; bizde kart bilgisi
     *                          saklanmadığı için elimizdeki tek tutamak bu
     */
    record PaymentIntent(
            String providerReference,
            FinanceEnums.TransactionStatus status,
            Money amount,
            String listingId) {}
}
