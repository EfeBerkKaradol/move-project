/**
 * Herkese açık sayaçlar ve sipariş akışı projeksiyonu (docs/09).
 *
 * <p>Doküman bu modülü "hiçbir modüle bağımlı değil, yalnızca olay tüketir" diye
 * tanımlıyor. Sayaçlar için henüz projeksiyon yok; canlı okuyup 60 saniye
 * önbelleklıyoruz. Kuralın asıl amacı — herkese açık trafiğin çekirdek tablolara
 * yüklenmemesi — önbellekle karşılanıyor. Akış (feed) yayınına geçilirken burası
 * gerçek projeksiyona taşınacak; o zaman bağımlılıklar da düşecek.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Güven Panosu",
        allowedDependencies = { "fleet::api", "ordering::api" }
)
package com.tasiyoruz.api.trustboard;
