# 09 — Güven Panosu (herkese açık sipariş ve değerlendirme akışı)

> Stratejik amaç: komisyonsuz dönemde tanınırlık ve **güven** inşa etmek.
> Yeni bir taşıma platformuna eşya teslim etmek yüksek güven gerektiren bir karar;
> "gerçek insanlar bunu kullanıyor ve memnun" kanıtı en güçlü ikna aracı.

## 1. Ne gösteriyoruz

Ana sayfada ve `/pano` adresinde üç katman:

### Katman 1 — Canlı sayaçlar (toplu, kimliksiz)
```
  Şu an yolda        Bugün tamamlanan     Ortalama puan      Ortalama eşleşme
      47                   312                4,8                 42 sn
  taşıma                 taşıma            (1.284 değerlendirme)
```
Şehir filtresi: `Tümü · İstanbul · Ankara · Hatay`.
Bu sayılar **toplu** — hiçbir bireysel siparişi açığa vurmuyor, o yüzden anlık olabilir.

### Katman 2 — Tamamlanan taşıma akışı
Her kart bir tamamlanmış sipariş:
```
┌──────────────────────────────────────────────────┐
│ Kadıköy → Beşiktaş            ★★★★★   14 dk önce │
│ Transporter · Tek büyük eşya · 9,2 km · 34 dk    │
│                                                  │
│ "Sürücü tam saatinde geldi, buzdolabını          │
│  asansörsüz 3. kata sorunsuz çıkardı."           │
│                             — E** K., İstanbul   │
└──────────────────────────────────────────────────┘
```
Yeni tamamlanan taşımalar akışın başına düşer (WebSocket). Bu canlılık hissi
güven sinyalinin kendisi — donmuş bir liste ikna etmiyor.

### Katman 3 — Şeffaflık istatistikleri
Şehir ve araç tipi kırılımında: toplam taşıma, ortalama puan, puan dağılımı (5'ten 1'e),
zamanında teslim oranı, ortalama eşleşme süresi, iptal oranı.

---

## 2. Gizlilik tasarımı — pazarlık konusu olmayan kurallar

Bu özelliğin doğal hâli tehlikeli. Devam eden bir siparişin rotasını yayınlamak,
"şu anda şu semtteki bir ev boşaltılıyor" bilgisini herkese açık hâle getirir.
Bu, hırsızlık ve takip riski yaratır. Aşağıdaki kurallar özelliğin kendisi kadar zorunludur.

| # | Kural | Gerekçe |
|---|---|---|
| 1 | **Yalnızca tamamlanmış siparişler** akışta görünür | Devam eden taşımanın rotası asla yayınlanmaz |
| 2 | Yayın **en az 30 dakika gecikmeli** | Taşıma bitse bile eşyanın yerleşmesi için zaman tanır |
| 3 | Konum **ilçe düzeyinde** — asla adres, koordinat veya bina | Yeniden kimliklendirmeyi engeller |
| 4 | İsim kısaltılır: `E** K.` · sürücü: `Mehmet A.` | Tam ad yayınlanmaz |
| 5 | Yorum yayını **açık rızaya** bağlı, ayrı onay kutusu | KVKK; sessiz varsayılan kabul edilemez |
| 6 | Kullanıcı kendi kaydını istediği an panodan **kaldırabilir** | `/panel/gizlilik` — tek tıkla, gerekçesiz |
| 7 | Aynı kullanıcının kayıtları **arka arkaya gösterilmez** | Davranış örüntüsü sızmasın |
| 8 | **k-anonimlik:** bir ilçe çiftinde son 24 saatte 5'ten az taşıma varsa ilçe yerine il gösterilir | Hatay gibi düşük hacimli bölgelerde tek taşımanın kime ait olduğu belli olurdu |
| 9 | Yorumlar yayından önce **moderasyondan** geçer | Telefon, adres, plaka, küfür, spam filtresi |
| 10 | Kesin saat gösterilmez, **göreli zaman** kullanılır ("14 dk önce") | Zaman + ilçe kombinasyonu kimliklendirici olabilir |
| 11 | Sipariş tutarı yayınlanmaz | Fiyat bilgisi ticari ve kişisel; ortalama fiyat aralığı ayrı gösterilir |

**Onay akışı:** Sipariş oluştururken tek bir açık kutu — *"Taşımam tamamlandıktan sonra
rotası (ilçe düzeyinde) ve değerlendirmem Güven Panosu'nda yayınlanabilir."*
Varsayılan **işaretsiz**. Puanlama ekranında yorum için ikinci ve ayrı bir onay alınır.

> Rıza oranı düşük çıkarsa çözüm varsayılanı işaretli yapmak **değil**; teşvik sunmak
> (küçük kupon) veya panonun değerini kullanıcıya iyi anlatmaktır. Sessiz rıza,
> KVKK açısından geçersiz ve güven inşa etme amacının tam tersi.

---

## 3. Dürüstlük ilkesi

Sadece 5 yıldızları göstermek panoyu bir reklam panosuna çevirir ve ters teper —
insanlar sahte yorumu tanır.

- **Tüm puanlar gösterilir**, düşük puanlar dâhil
- Puan dağılımı açıkça yayınlanır (5★ %78, 4★ %14, 3★ %5, 2★ %2, 1★ %1)
- Düşük puanlı yorumlara **firma/operasyon yanıtı** eklenebilir ve bu da görünür
- Filtre "sadece düşük puanlar" seçeneğini de içerir

Kötü bir yorumun görünür olması ve altında ciddi bir yanıt bulunması, mükemmel bir
ortalamadan daha fazla güven üretir.

**Manipülasyon koruması:**
- Puan yalnızca **tamamlanmış ve ödenmiş** bir siparişten gelebilir — doğrulanmış
- Kullanıcı başına sipariş başına tek puan
- Aynı IP/cihazdan anormal sipariş-puan örüntüsü tespiti
- Sürücü ve müşteri birbirinin puanını **karşılıklı verilene kadar veya 7 gün geçene
  kadar göremez** — misilleme puanlamasını engeller

---

## 4. Teknik tasarım

### Veri akışı
```
OrderCompleted ─┐
                ├─► outbox ─► trustboard modülü ─► public_feed_entries
RatingSubmitted ┘                    │              (denormalize projeksiyon)
                                     │
                                     ├─► gizlilik filtresi uygula
                                     │   (rıza? ilçe? k-anonimlik? moderasyon?)
                                     ├─► Redis sayaçlarını güncelle
                                     └─► WS `public:feed` kanalına yayınla
```

`public_feed_entries` tablosu bilerek **denormalize**: `orders` tablosuna hiç dokunmadan
okunabilir olmalı. Ana sayfa trafiği çekirdek işlem tablolarını yormamalı.

### Şema
```
PublicFeedEntry     id, orderId(FK, sadece iç kullanım),
                    fromDistrict, toDistrict, cityCode,
                    vehicleTypeCode, cargoCategoryCode,
                    distanceMeters, durationMinutes,
                    rating, ratingTags[], comment?,
                    customerDisplayName,   // "E** K."
                    driverDisplayName,     // "Mehmet A."
                    publishedAt,           // completedAt + 30 dk
                    status(PENDING_MODERATION|PUBLISHED|HIDDEN|WITHDRAWN),
                    hiddenReason?
PublicBoardStats    cityCode, date, totalTrips, avgRating,
                    ratingDistribution(JSONB), avgMatchSeconds,
                    onTimeRate, cancellationRate
```

Not: `PublicFeedEntry` müşteri `userId`'sini **tutmaz**. Yalnızca `orderId` var ve o da
API yanıtında hiç yer almaz — sadece kullanıcının "kaydımı kaldır" talebini eşleştirmek için.

### Performans
- Akış Redis'te önbelleklenir (ilk 50 kayıt, şehir bazlı ayrı liste)
- Sayaçlar Redis counter — her tamamlanan taşımada `INCR`
- Web tarafında ISR (`revalidate: 60`) + WS ile canlı ekleme
- Ana sayfa akışı **sunucuda render edilir** (SEO: gerçek içerik, gerçek yorumlar)

### SEO değeri
Pano yan fayda olarak ciddi bir SEO varlığı: sürekli büyüyen, özgün, kullanıcı üretimi
içerik. Şehir sayfalarına o şehrin gerçek taşımaları ve yorumları gömülür —
bu, programatik SEO sayfalarının "ince içerik" riskini de ortadan kaldırır.
`Review` ve `AggregateRating` JSON-LD şemaları eklenir.

---

## 5. Komisyonsuz dönem ve pano

Komisyonsuz dönem (→ 2027 Q1) ile pano aynı stratejinin iki parçası:
komisyonsuzluk **arzı** çekiyor, pano **talebin** güvenmesini sağlıyor.

Panoda bu dönem açıkça duyurulur — gizlenmesi gereken bir şey değil, avantaj:

> **Komisyonsuz dönem · 2027 ilk çeyreğine kadar**
> Taşıyoruz taşıma ücretinden komisyon almıyor. Ödediğiniz tutarın tamamı
> taşımayı yapan firmaya ve sürücüye gidiyor.

Bu mesaj hem müşteriye (fiyat avantajı) hem sürücüye (kazanç avantajı) aynı anda konuşuyor.

**Komisyona geçiş dürüst yapılmalı:** Oran değişimi en az 30 gün önceden hem panoda hem
e-posta ile duyurulur. Sessizce komisyon eklemek, panoyla inşa edilen güvenin tamamını
tek hamlede harcar.
