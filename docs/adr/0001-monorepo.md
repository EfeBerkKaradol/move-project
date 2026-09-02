# ADR-0001 — Tek monorepo, pnpm workspace

**Durum:** Kabul · **Tarih:** 2026-09-02

## Bağlam
Proje 4 istemci uygulaması (web, admin, müşteri mobil, sürücü mobil) ve 1 backend servisi
içeriyor. Bunlar arasında paylaşılan çok şey var: API tipleri, doğrulama şemaları,
tasarım token'ları, sabitler, i18n mesajları.

## Karar
Hepsi tek repoda, pnpm workspace + Turborepo ile yönetilir.

## Gerekçe
- **Atomik değişiklik:** API alanı değiştiğinde backend + contracts + 4 istemci tek PR'da
  güncellenir. Ayrı repolarda bu, koordineli 5 PR ve sürüm yayını demek.
- **Tip zinciri:** OpenAPI → contracts → istemciler. Ayrı repolarda npm paketi yayınlama
  ve sürüm yönetimi ek yük.
- **Tek geliştirici:** Bağlam değiştirme maliyeti minimum.
- Turborepo cache ile CI süresi kontrol altında; sadece değişen paketler build edilir.

## Sonuçlar
- Repo boyutu büyür; sığ klonlama ve CI'da seçici checkout gerekebilir
- Java ve TypeScript aynı repoda — CI hattı iki ekosistemi de bilmek zorunda
- Erişim kontrolü repo geneli; ileride harici bir ekip sadece mobil app'e çalışacaksa
  bu bir kısıt olur (o noktada git subtree/submodule değerlendirilir)

## Reddedilenler
- **Polyrepo:** Bağımsız sürümleme avantajı bu ölçekte kazanç değil, koordinasyon yükü.
- **Nx:** Turborepo'dan güçlü ama daha fazla yapılandırma. İhtiyaç doğarsa geçilebilir.
