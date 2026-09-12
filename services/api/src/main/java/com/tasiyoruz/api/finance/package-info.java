/**
 * Finans: hareket defteri, komisyon, vergi, hakediş ve mutabakat.
 *
 * <p><strong>Temel ayrım:</strong> brüt işlem hacmi (GMV) ile platform geliri aynı
 * şey değil. 10.000 TL'lik bir taşıma 10.000 TL olarak kaydedilir; platformun
 * geliri o tutarın tamamı değil komisyonudur. Bu modül ikisini hiçbir yerde
 * birbirine karıştırmaz.
 *
 * <p><strong>Sağlayıcı yok.</strong> Gerçek ödeme, hakediş ve fatura sağlayıcısı
 * bağlı değil. Dışarıya açılan her nokta bir arayüz ({@code PaymentProvider},
 * {@code PayoutProvider}, {@code InvoiceProvider}) ve bugün yalnızca sahte
 * uygulamaları var. Hiçbir yerde sağlayıcıya özel çağrı bulunmuyor.
 *
 * <p>Tarife ve komisyon oranı {@code pricing} modülünün konfigürasyonundan
 * okunuyor; burada ikinci bir oran tanımı yok.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Finans",
        allowedDependencies = { "ordering::api", "pricing::api", "tracking::api" }
)
package com.tasiyoruz.api.finance;
