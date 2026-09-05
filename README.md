# TurMove — Yük Taşıma ve Teslimat Platformu

Kullanıcıları nakliyecilerle buluşturan, sipariş öncesi net fiyat veren, taşıma boyunca
canlı araç takibi sunan ve müşteriyle nakliyeci arasında pazarlığa izin veren
on-demand lojistik pazaryeri.

> Marka adı geçici olarak **TurMove**. Alan adı ve kurumsal kimlik netleşince güncellenecek.

## İlk açılış

| | |
|---|---|
| **Şehirler** | İstanbul · Ankara · Hatay |
| **Komisyon** | 2027 ilk çeyreğine kadar **%0** — tanınırlık ve güven inşası dönemi |
| **Fiyat temeli** | Nakliye firmalarıyla anlaşılan birim fiyatlar (görüşmeler sürüyor) |
| **Barındırma** | Türkiye |

## Hizmet modelleri

**Anlık taşıma** — adres ve yük bilgisi gir, önerilen aracı ve fiyatı gör,
dakikalar içinde nakliyeciyle eşleş.

**Planlı taşıma** — aynı akış, ileri tarihli randevuyla.

Her iki modelde de kullanıcı **"ne taşımak istiyorsunuz?"** panelinden yük kategorisini
seçer, sistem uygun aracı önerir ve kullanıcı isterse **pazarlık** başlatır.

## Ürün yüzeyleri

| Yüzey | Teknoloji | Hedef kitle |
|---|---|---|
| `apps/web` | Next.js 15 | Pazarlama sitesi · güven panosu · müşteri portalı |
| `apps/admin-web` | Next.js 15 | Operasyon ve destek ekibi |
| `apps/mobile-customer` | Expo (React Native) | Yük sahibi |
| `apps/mobile-driver` | Expo (React Native) | Nakliyeci / sürücü |
| `services/api` | Spring Boot 4 · Java 21 | Çekirdek backend (modüler monolit) |

## Araç filosu

`Motor` · `Doblo` · `Transporter` · `Transit` · `Kamyonet` · `Kamyon` · `Tır`

## Dokümantasyon

| Doküman | İçerik |
|---|---|
| [01 — Ürün Gereksinimleri](docs/01-gereksinimler.md) | Aktörler, kullanıcı hikâyeleri, fonksiyonel ve fonksiyonel olmayan gereksinimler |
| [02 — Sistem Mimarisi](docs/02-mimari.md) | Monorepo yapısı, modüller, veri akışları, dispatch ve tracking tasarımı |
| [03 — Teknoloji Seçimleri](docs/03-teknoloji-secimleri.md) | Web / backend / mobil / altyapı stack'i ve gerekçeleri |
| [04 — Domain Modeli](docs/04-domain-modeli.md) | Varlıklar, ilişkiler, durum makineleri, veritabanı şeması |
| [05 — API Sözleşmesi](docs/05-api-sozlesmesi.md) | REST uçları, WebSocket kanalları, hata modeli |
| [06 — Web UI Planı](docs/06-web-ui-plani.md) | Sayfa haritası, tasarım sistemi, SEO stratejisi |
| [07 — Yol Haritası](docs/07-yol-haritasi.md) | Fazlar, süreler, çıkış kriterleri, riskler |
| [08 — Yük Kategorileri ve Araç Önerisi](docs/08-yuk-kategorileri-ve-arac-onerisi.md) | Kategori paneli, eşya kataloğu, öneri motoru |
| [09 — Güven Panosu](docs/09-guven-panosu.md) | Herkese açık sipariş akışı, gizlilik tasarımı |
| [10 — Pazarlık](docs/10-pazarlik.md) | Müşteri ↔ nakliyeci fiyat müzakeresi |
| [11 — Konvoy Model Değişikliği](docs/11-konvoy-model-degisikligi.md) | Teklif pazarı, 81 il, boş dönüş — tasarımın önceki plandan neyi değiştirdiği |
| [12 — Fiyat Araştırması](docs/12-fiyat-arastirmasi.md) | Eylül 2026 piyasa verisi, kaynaklar ve V6 tarifesinin kalibrasyonu |
| [ADR'ler](docs/adr/) | Kalıcı mimari kararlar ve gerekçeleri |
| [🔑 Anahtarlar](ANAHTARLAR.md) | Sağlanması gereken API anahtarları ve hesaplar — ilerleme listesi |

## Durum

Faz 0 (temel kurulum) başlamadı. Plan onaylandıktan sonra iskelet kurulacak.
