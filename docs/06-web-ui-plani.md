# 06 — Web UI Planı

## 1. İki farklı ürün, tek uygulama

`apps/web` iki işi birden yapıyor ve bunların tasarım hedefleri farklı:

| | Pazarlama yüzeyi | Uygulama yüzeyi |
|---|---|---|
| Amaç | İkna et, güven ver, SEO trafiği çek | İşi hızlı bitirt |
| Render | SSG / ISR | Client-side + SSR |
| Tempo | Cömert boşluk, animasyon, büyük görsel | Yoğun, hızlı, animasyon minimal |
| Ölçü | Dönüşüm oranı | Görev tamamlama süresi |

Next.js route group'larıyla ayrılır: `app/(marketing)/` ve `app/(app)/`.
Ortak olan sadece tasarım token'ları ve temel bileşenler.

## 2. Sayfa haritası

### Pazarlama — `app/(marketing)/`
```
/                              Ana sayfa — güven panosu ana sayfada, katlamanın hemen altında
/pano                          Güven panosu (tam sayfa, filtreli)
/fiyat-hesapla                 Kategori paneli + araç önerisi + fiyat  ← ana dönüşüm noktası
/nasil-calisir                 4 adım: ne taşıyorsun → araç önerisi → pazarlık → takip
/pazarlik                      Pazarlık nasıl çalışır (özellik sayfası)
/araclar                       Araç filosu ve kapasiteleri
  /araclar/[aracTipi]          motor · doblo · transporter · transit · kamyonet · kamyon · tir
/kategoriler/[kategori]        Yük kategorisi landing (SEO: "buzdolabı taşıma", "ev taşıma")
/sehirler                      İstanbul · Ankara · Hatay
  /sehirler/[sehir]            Şehir landing — o şehrin gerçek pano kayıtları gömülü
  /sehirler/[sehir]/[kategori] Şehir × kategori kesişimi (SEO uzun kuyruk)
/nakliyeci-ol                  Kazanç hesaplayıcı + komisyonsuz dönem vurgusu + başvuru
/kurumsal                      İşletmeler için çözümler
/hakkimizda  /iletisim  /sss  /blog  /blog/[slug]
/kvkk  /gizlilik-politikasi  /kullanici-sozlesmesi  /cerez-politikasi
```

### Uygulama — `app/(app)/`
```
/giris                         Telefon + OTP
/kayit                         Kayıt (bireysel / kurumsal seçimi)
/panel                         Kontrol paneli — aktif siparişler öne
/panel/siparis/yeni            Sipariş oluşturma sihirbazı
/panel/siparis/[id]            Sipariş detayı
/panel/siparis/[id]/takip      Canlı takip (tam ekran harita)
/panel/siparis/[id]/pazarlik   Pazarlık — gelen teklifleri karşılaştır
/panel/siparisler              Sipariş geçmişi
/panel/adresler                Adres defteri
/panel/profil                  Profil
/panel/gizlilik                Rıza yönetimi + panodaki kayıtlarımı kaldır
/panel/faturalar               Faturalar (Faz 6)
/panel/kurumsal/*              Kurumsal: ekip, cari hesap, toplu gönderi

/t/[token]                     Alıcı takip sayfası — hesapsız, tek ekran
```

### Filo / firma — `app/(fleet)/`
```
/filo                          Filo özeti
/filo/surucular  /filo/araclar  /filo/isler  /filo/raporlar
/filo/pazarliklar              Açık pazarlık teklifleri
/filo/birim-fiyatlar           Sözleşmeli birim fiyat kartı (salt okunur)
```

## 3. Kritik akış: Yük tarifi → Araç önerisi → Fiyat → Sipariş

Ürünün en önemli akışı. Ayırt edici nokta: **kullanıcıya araç sordurmuyoruz.**

```
1. MODEL        [ Anlık taşıma ]  [ Planlı taşıma ]
                seçim yapılınca alt panel açılır

2. KATEGORİ     "NE TAŞIMAK İSTİYORSUNUZ?"
                8 kart, küçükten büyüğe, her birinde ölçek referansı
                ve tipik hacim aralığı  (bkz. doküman 08)

3. DETAY        Kategoriye özel form:
                eşya kataloğundan çoklu seçim / ev tipi / palet sayısı
                → seçtikçe sağda tahmin canlı güncellenir

4. ÖNERİ        Birincil araç + doluluk göstergesi + "neden bu araç"
                1-2 alternatif · önerilen ek hizmetler
                kullanıcı isterse öneriyi ezebilir (uyarıyla)

5. ADRES        Alış / teslim adresi, kat, asansör, ek durak
                → fiyat canlı güncellenir (debounce 400 ms)

6. ÖZET         Şeffaf fiyat dökümü — komisyon satırı 0 ₺ olarak görünür
                ┌ Hemen sipariş ver ┐  ← birincil
                └ Pazarlık yap      ┘  ← ikincil, süre + ortalama tasarruf yazılı

7. GİRİŞ        Buraya kadar giriş yok. Sipariş için OTP.
                (fiyatı ve öneriyi önce gösteriyoruz, kimliği sonra istiyoruz)

8a. ARANIYOR    Nakliyeci aranıyor + canlı durum ("3 nakliyeciye soruldu")
8b. PAZARLIK    Teklif karşılaştırma ekranı, geri sayım, "Önerilen" rozeti

9. TAKİP        Harita + aşama zaman çizelgesi + nakliyeci kartı
10. PUANLA      Puan + yorum + panoda yayın rızası (ayrı kutu)
```

**Adım 2-4 tek ekranda, tek akışta.** Kullanıcı kategoriyi seçer seçmez detay formu
aşağıda açılır, seçim yaptıkça öneri sağda canlı güncellenir. Sihirbaz adımları arasında
sayfa geçişi yok — bu, algılanan hızı belirgin biçimde artırıyor.

**Durum yönetimi:** Sihirbaz adımları Zustand store'da; URL'e adım yazılır
(`?adim=arac`) — geri tuşu çalışsın, kullanıcı linki paylaşabilsin, yenilemede kaybolmasın.
Taslak `sessionStorage`'a yedeklenir.

**Mobil-first zorunluluğu:** Trafiğin çoğunluğu mobilden gelecek. Adres seçimi mobilde
tam ekran bottom sheet, harita üstte sabit, alt panel kaydırılabilir.

## 4. Ana sayfa ve güven panosu

Ana sayfanın işi tek bir şey: **"buraya eşyamı emanet edebilir miyim?"** sorusuna cevap vermek.
Bu yüzden pano, katlamanın hemen altında — pazarlama metninden önce.

```
┌─────────────────────────────────────────────────────┐
│  HERO                                               │
│  Ne taşıyacağını söyle, aracı biz bulalım           │
│  [ Anlık taşıma ]  [ Planlı taşıma ]                │
│  ─ komisyonsuz dönem rozeti ─                       │
├─────────────────────────────────────────────────────┤
│  CANLI SAYAÇLAR                                     │
│   47 yolda · 312 bugün · ★4,8 · 42 sn eşleşme       │
│   [Tümü] [İstanbul] [Ankara] [Hatay]                │
├─────────────────────────────────────────────────────┤
│  GÜVEN PANOSU AKIŞI                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐          │
│  │Kadıköy→   │ │Çankaya→   │ │Antakya→   │  →       │
│  │Beşiktaş   │ │Keçiören   │ │İskenderun │          │
│  │★★★★★ 14dk │ │★★★★☆ 22dk │ │★★★★★ 31dk │          │
│  └───────────┘ └───────────┘ └───────────┘          │
│  [ Tüm taşımaları gör → /pano ]                     │
├─────────────────────────────────────────────────────┤
│  NASIL ÇALIŞIR (4 adım, scroll-driven)              │
│  ARAÇ FİLOSU · PAZARLIK · NAKLİYECİ OL              │
└─────────────────────────────────────────────────────┘
```

**Akış canlı.** Yeni tamamlanan taşıma WebSocket ile akışın başına yumuşak bir animasyonla
düşer. Bu hareket güven sinyalinin kendisi — donmuş bir liste ikna etmez.

**Sunucuda render edilir.** Pano içeriği gerçek metin olarak HTML'de bulunur; SEO açısından
sürekli büyüyen özgün içerik demek. `Review` ve `AggregateRating` JSON-LD eklenir.

**Dürüstlük görünür yerde:** Puan dağılımı çubuğu (5★'dan 1★'a) panonun üstünde durur ve
"sadece düşük puanlar" filtresi vardır. Mükemmel bir ortalamadan çok, kötü yorumun altındaki
ciddi yanıt güven üretir.

## 5. Canlı takip ekranı

```
┌─────────────────────────────────────┐
│                                     │
│        HARİTA (tam genişlik)        │
│   • sürücü marker'ı (dönen, yumuşak │
│     interpolasyonla hareket eder)   │
│   • rota polyline                   │
│   • alış / teslim pinleri           │
│                                     │
├─────────────────────────────────────┤  ← sürüklenebilir bottom sheet
│  ● Yolda                 ETA 12 dk  │
│  ─────────────────────────────────  │
│  [foto] Mehmet A.  ★ 4.9            │
│         34 ABC 123 · Uzun Panelvan  │
│         [ Ara ]  [ Mesaj ]          │
│  ─────────────────────────────────  │
│  ✓ Sürücü atandı          14:12     │
│  ✓ Alış noktasına vardı   14:26     │
│  ✓ Yükleme tamamlandı     14:35     │
│  ● Yolda                            │
│  ○ Teslim ediliyor                  │
│  ─────────────────────────────────  │
│  MV-2026-000123 · 629,00 ₺          │
│  [ Takip linkini paylaş ]           │
└─────────────────────────────────────┘
```

**Marker hareketi:** Konum güncellemeleri 5 sn aralıklı geliyor ama marker'ın zıplaması
kötü görünür. İki nokta arasında `requestAnimationFrame` ile interpolasyon yapılır ve
marker rotayı takip ederek yumuşak ilerler — algılanan kalite farkı büyük.

**Bağlantı durumu:** WS koptuğunda ekranın üstünde ince bir "Bağlantı yeniden kuruluyor"
şeridi çıkar; son bilinen konum soluk gösterilir. Sessizce donmuş bir harita en kötü senaryo.

## 6. Tasarım sistemi

### Renk
Referans siteler turuncu/sarı (Lalamove) ve mavi (Qmove) kullanıyor. Ayrışmak ve
lojistikte "hız + güven" hissi vermek için **derin petrol (güven) + canlı yeşil
(hareket, ilerleme, "yolda")** öneriliyor. Yeşil ayrıca pano puanları ve doluluk
göstergesiyle doğal uyum sağlıyor. Nihai palet TurMove marka kimliği kesinleşince oturur.

```css
/* Tailwind v4 — CSS-first token tanımı */
@theme {
  --color-brand-50 … --color-brand-950;    /* birincil */
  --color-accent-*;                        /* aksiyon, ilerleme */
  --color-success-* --color-warning-* --color-danger-*;
  --color-surface-* --color-text-*;

  --radius-card: 1rem;
  --shadow-card: 0 1px 3px rgb(0 0 0 / .08), 0 8px 24px rgb(0 0 0 / .04);
  --font-sans: "Inter Variable", system-ui, sans-serif;
}
```
Karanlık mod ilk günden token seviyesinde desteklenir (sonradan eklemek 3 kat pahalı).

### Tipografi
Inter Variable (Türkçe karakterler — ğ, ş, ı, İ, ö, ü, ç — tam destekli).
Ölçek: 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56. Gövde metni 16px'in altına inmez.

### Bileşen envanteri (`packages/ui`)
```
Temel        Button · Input · Select · Checkbox · Radio · Switch · Textarea
             Badge · Avatar · Skeleton · Spinner · Tooltip · Toast
Yerleşim     Card · Sheet · Dialog · Drawer · Tabs · Accordion · Separator
Domain       CargoCategoryGrid ölçek referanslı 8 kategori kartı, küçükten büyüğe
             CargoItemPicker   eşya kataloğu, adet stepper, canlı tahmin
             VehicleSuggestion birincil öneri + gerekçe + "neden bir alt araç değil"
             FillGauge         doluluk çubuğu, %95 üstü uyarı rengine döner
             AddressInput      adres arama + harita pin, autocomplete session token'lı
             VehicleTypeCard   ikon, kapasite, örnek yük, fiyat
             PriceBreakdown    kalem kalem fiyat dökümü, komisyon satırı dâhil
             NegotiationPanel  teklif girişi, taban göstergesi, geri sayım
             OfferCompareList  gelen teklifler: fiyat · puan · ETA · gerekçe
             BoardFeedCard     pano kaydı: rota, araç, puan, yorum, göreli zaman
             LiveCounter       canlı sayaç, değişimde yumuşak sayı geçişi
             RatingDistribution puan dağılımı çubuğu (5★→1★)
             OrderStatusBadge  duruma göre renk + ikon
             TripTimeline      aşama zaman çizelgesi
             DriverCard        sürücü bilgi kartı
             LiveMap           harita + marker interpolasyonu + rota
             ETAPill           canlı güncellenen varış süresi
             StepWizard        sihirbaz kabuğu, URL senkronizasyonlu
             EmptyState        boş durum + eylem
```

### Erişilebilirlik (WCAG 2.2 AA)
- Tüm etkileşimli öğeler klavyeyle erişilebilir, görünür focus halkası
- Kontrast: normal metin ≥ 4.5:1, büyük metin ≥ 3:1
- Harita bilgisi **yalnızca görsel olamaz** — ETA ve durum metin olarak da verilir,
  `aria-live="polite"` ile güncellenir
- Dokunma hedefi ≥ 44×44 px (sürücü arayüzünde ≥ 56 px)
- Form hataları alanla `aria-describedby` üzerinden ilişkilendirilir
- `prefers-reduced-motion` desteklenir — animasyonlar kapanır, marker atlar
- CI'da axe-core ile otomatik denetim

## 7. SEO stratejisi

Qmove'un yaptığı ve doğru olan şey: şehir ve hizmet bazlı landing sayfalarıyla uzun kuyruk
arama trafiği toplamak. Bunu daha sistemli yapacağız.

**Programatik sayfalar:** `şehir × kategori` matrisi
`/sehirler/istanbul/ev`, `/sehirler/ankara/tekil-esya`, `/sehirler/hatay/insaat` …
3 şehir × 8 kategori = 24 sayfa. Az görünüyor ama **her biri gerçek içerikle dolu** —
bu, 400 boş sayfadan kıyaslanamayacak kadar değerli.

İnce içerik riski güven panosu sayesinde ortadan kalkıyor: her sayfa o şehirdeki
o kategoriye ait **gerçek taşıma kayıtlarını ve gerçek yorumları** gömüyor. Sayfa
kendi kendine büyüyor, içerik üretmek gerekmiyor.

Ek olarak kategori sayfaları (`/kategoriler/tekil-esya`) doğal arama karşılıkları
taşıyor: "buzdolabı taşıma", "koltuk nakliyesi", "ev taşıma aracı", "palet taşıma".
Yeni şehir açıldıkça matris otomatik genişler.

**Teknik:**
- ISR (`revalidate: 3600`) — fiyat verileri güncel kalsın
- `generateMetadata` ile sayfa bazlı başlık/açıklama/OG görseli
- JSON-LD: `MovingCompany` / `LocalBusiness`, `Service`, `FAQPage`, `AggregateRating`,
  `Review` (pano kayıtları), `BreadcrumbList`
- `sitemap.xml` dinamik üretim, `robots.txt`, kanonik URL
- `hreflang` tr-TR / en-TR
- Core Web Vitals hedefleri: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Görseller `next/image` ile AVIF/WebP, harita bileşeni **lazy** (LCP'yi bozmasın —
  pazarlama sayfalarında harita statik görselle temsil edilir, tıklayınca yüklenir)

**İçerik ekseni:** Blog — "Evden eve nakliyat fiyatları 2026", "Taşınma kontrol listesi",
"Hangi eşya hangi araca sığar", "Nakliyeci seçerken dikkat edilecekler".

## 8. Animasyon ve motionsites.ai

Animasyon **süsleme değil, anlam taşımalı**:

| Yer | Animasyon | Neden |
|---|---|---|
| Hero | Rota çizgisinin şehir silüetinde ilerlemesi | Ürünü tek bakışta anlatır |
| "Nasıl çalışır" | Scroll-driven 4 adım | Sürecin anlaşılırlığı |
| Kategori kartları | Hover'da ölçek referansı büyür | Boyut algısını pekiştirir |
| Doluluk göstergesi | Yükün araca yerleşme animasyonu | "Sığıyor" hissini görsel olarak kurar |
| Pano akışı | Yeni kaydın yukarıdan yumuşak girişi | Canlılık = güven sinyali |
| Canlı sayaçlar | Sayı değişiminde rakam geçişi | Platformun yaşadığını gösterir |
| Nakliyeci aranıyor | Yayılan halka + sayaç | Bekleme süresini kısa hissettirir |
| Pazarlık geri sayımı | Halka şeklinde azalan zaman | Aciliyeti sakin biçimde iletir |
| Aşama geçişi | Zaman çizelgesinde işaretin yerleşmesi | İlerleme geri bildirimi |
| Marker | Rota üzerinde yumuşak interpolasyon | Canlılık algısı |

`motionsites.ai` bileşenleri özellikle hero, "nasıl çalışır" ve sosyal kanıt bölümlerinde
kullanılacak.
> ⚠️ MCP sunucusu şu anda yetkilendirilmemiş; bağlanmadan bileşenlerini çekemiyorum.
> claude.ai connector ayarlarından yetkilendirdikten sonra bu bölümler somutlaştırılacak.

**Performans kuralı:** Sadece `transform` ve `opacity` animasyonu (compositor'da çalışır).
`width`, `height`, `top`, `left` animasyonu yasak. Ağır animasyonlar viewport'a girene
kadar başlamaz (`IntersectionObserver`).

## 9. Admin panel (`apps/admin-web`)

Ayrı Next.js uygulaması. Gerekçe: pazarlama sitesiyle tamamen farklı bundle, farklı
erişim modeli (VPN/IP kısıtlı olabilir), farklı yayın döngüsü.

```
/                    Canlı harita — aktif sürücü ve siparişler
/siparisler          Gelişmiş filtre, toplu işlem, detay çekmecesi
/nakliyeci-onay      Belge inceleme kuyruğu (yan yana belge + form)
/nakliyeciler        Nakliyeci listesi, metrikler, askıya alma
/firmalar            Sözleşmeli firmalar ve birim fiyat kartları
/fiyatlandirma       Birim fiyat kartı + komisyon yönetimi (versiyonlu, önizlemeli)
/pazarlik-politika   Taban/tavan yüzdeleri, tur ve süre limitleri
/katalog             Araç kapasiteleri, yük kategorileri, eşya kataloğu
/pano-moderasyon     Yayın bekleyen kayıtlar, yorum moderasyonu, operasyon yanıtı
/bolgeler            Harita üzerinde poligon çizimi
/kuponlar            Kupon üretimi ve kullanım takibi
/uyusmazliklar       Uyuşmazlık kuyruğu
/raporlar            GMV, hacim, eşleşme süresi, iptal oranı, arz/talep ısı haritası
/denetim             Audit log
```

Tasarım önceliği: yoğunluk ve klavye verimliliği. Operasyon ajanı günde yüzlerce kayıt
görüyor — cömert boşluk burada düşman. Komut paleti (`Cmd+K`) ile hızlı sipariş arama.
