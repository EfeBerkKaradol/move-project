# 11 — Taşıyoruz: Ürün Modeli Değişikliği

> Kaynak: "Taşıyoruz Nakliye Ana Sayfa" tasarımı.
> Bu doküman, tasarımın önceki plandan (docs/01–10) neyi değiştirdiğini kaydeder.

## 1. Özet: ne değişti

Tasarım yalnızca bir görsel dil getirmiyor; **iş modelini değiştiriyor.**

| | Önceki plan (Taşıyoruz) | Tasarım (Taşıyoruz) |
|---|---|---|
| Marka | Taşıyoruz | **Taşıyoruz** |
| Eşleştirme | Sistem fiyat verir → en yakın sürücüye atar (dispatch) | **Araç sahipleri teklif verir → müşteri seçer** |
| Kapsam | 3 il, şehir içi | **81 il, şehirlerarası** |
| Giriş noktası | Yük kategorisi paneli → araç önerisi | **Nereden/nereye + araç tipi → tahmini fiyat** |
| İki taraflılık | Müşteri odaklı, sürücü ayrı uygulama | **Ana sayfada iki sekme: "Yük vereceğim" / "Aracım var"** |
| Farklılaştırıcı | Yük kategorisi → araç önerisi | **Boş dönüş (koridor) eşleştirme** |
| Ödeme | Ön provizyon → teslimde çekim | **Teslimatta onay** |
| Belgeler | Ehliyet, ruhsat, SRC, K belgesi | Aynı + **kamerayla tek seferde yükleme** |
| Teslim kanıtı | Fotoğraf + imza | Fotoğraf + **e-irsaliye** |

**Korunanlar:** fiyat motoru (tarife, kademeli mesafe, komisyon satırı), yük kataloğu ve
araç öneri motoru (tasarımdaki "fotoğraf çekin, sistem araç tipini önersin" aynı motora
dayanıyor), canlı takip, güven panosu fikri, KVKK tasarımı.

**Düşenler:** anlık dispatch dalgaları (docs/02 §5) artık çekirdek değil — teklif akışı
onun yerine geçiyor. Pazarlık (docs/10) da yeniden konumlanıyor: tasarım "işi almak için
pazarlığa girmenize gerek yok" diyor, yani **karşılıklı pazarlık yerine tek turlu teklif**.

---

## 2. Yeni çekirdek: teklif pazarı

### Akış
```
Yük veren                     Taşıyoruz                      Araç sahipleri
   │                            │                               │
   ├─ rota + araç tipi ────────►│                               │
   │                            ├─ tahmini fiyat aralığı ──────►│
   │◄─ "1.850 - 2.400 ₺" ───────┤   (kayıt istenmeden)          │
   │                            │                               │
   ├─ ilanı yayınla ───────────►│                               │
   │                            ├──── uygun araçlara ilan ─────►│
   │                            │                               │
   │◄──────── teklifler ────────┼◄──── teklif (tek tur) ────────┤
   │  puan · tamamlanan iş      │                               │
   │  araç bilgisi · fiyat      │                               │
   │                            │                               │
   ├─ birini seç ──────────────►├──── iş ataması ──────────────►│
   │                            │                               │
   └─ takip → teslimatta onay ──┴───────────────────────────────┘
```

### Önceki dispatch'ten farkı
- **Fiyatı platform dayatmıyor**, aralık öneriyor; kesin fiyatı araç sahibi veriyor.
- **Eşleştirme anlık değil**: ilan açık kalıyor, teklifler birikiyor. Ortalama ilk teklif
  süresi tasarımda öne çıkan bir metrik (`[11 dk]`).
- **Müşteri seçiyor.** Sistem sıralıyor ama atamıyor.

### Domain
```
LoadListing        id, shipperId, fromLocation, toLocation, vehicleTypeCode,
                   cargoDescription, photos[], weightKg?, estimatedRange(min,max),
                   pickupWindow, status(DRAFT|OPEN|OFFERED|AWARDED|EXPIRED|CANCELLED),
                   publishedAt, expiresAt
CarrierOffer       id, listingId, carrierId, vehicleId, amount, note?,
                   estimatedPickupAt, status(SUBMITTED|WITHDRAWN|ACCEPTED|REJECTED),
                   submittedAt
                   -- tek tur: bir taşıyıcı bir ilana bir teklif verir
CarrierProfile     ...önceki DriverProfile + rating, completedJobs, documentsVerifiedAt
```

`LoadListing` durum makinesi, önceki `Order`'ın `SEARCHING_DRIVER` dalını devralıyor;
`AWARDED` olduğunda mevcut `Trip` akışı (docs/04 §3.1) değişmeden devam ediyor.

---

## 3. Farklılaştırıcı: boş dönüş eşleştirme

Tasarımın "Farkımız" bölümü. Araç sahibi yükünü bıraktığı şehirden dönerken boş
gitmesin diye, dönüş rotasına (**koridor**) düşen ilanlar ona getiriliyor.

### Domain
```
Corridor           id, carrierId, vehicleId,
                   originLocation, destinationLocation,
                   departureWindow(from, to),
                   detourToleranceKm,        -- rotadan ne kadar sapabilir
                   minAmount?,               -- altına düşmesin
                   status(ACTIVE|PAUSED|EXPIRED)
CorridorMatch      id, corridorId, listingId, score, detourKm,
                   notifiedAt, respondedAt, outcome(OFFERED|IGNORED|EXPIRED)
```

### Eşleştirme mantığı
Bir ilan yayınlandığında, açık koridorlar arasında şu koşulları sağlayanlar aday:

```
uygun = koridorlar.filtre(k =>
          k.aracTipi kapasitesi ≥ ilan.gereksinim          ∧
          zamanPenceresi kesişiyor                          ∧
          sapma(k.rota, ilan.alış, ilan.teslim) ≤ k.sapmaToleransı ∧
          ilan.tahminiTutar ≥ k.minTutar )

skor = w1·(1/sapmaKm) + w2·zamanUyumu + w3·taşıyıcıPuanı + w4·tutar
```

**Sapma hesabı** kritik: koridor İstanbul→İzmir ise, Ankara'daki bir yük ancak
İstanbul→Ankara→İzmir toplam mesafesi İstanbul→İzmir'den `detourToleranceKm` kadar
fazlaysa uygundur. Bu, rota motoruna (docs/03) ikinci bir çağrı tipi ekliyor:
**"ara nokta eklenirse ne kadar uzar?"**

> ✅ Uygulandı (V11). Uygulamada iki nokta dokümandan ayrıldı:
>
> 1. **Puan formülü.** Ham `1/sapmaKm` kullanılmadı; sapma sıfıra yaklaşınca sonsuza
>    gidip diğer bileşenleri eziyordu. Her bileşen 0-1 aralığına çekildi, ağırlıklar
>    toplamı 1 (sapma 0,50 · zaman uyumu 0,30 · sapma km'si başına kazanç 0,20).
> 2. **Taşıyıcı puanı bileşeni yok.** Değerlendirme modülü boş; olmayan veriyi sabitle
>    doldurmak sıralamayı sessizce bozardı. Modül gelince ağırlıklar yeniden dağıtılacak.
>
> Eşleştirme `ListingPublished` olayını dinliyor. Olay yeniden teslim edilebildiği ve
> koridor kurulurken yapılan tarama aynı anda çalışabildiği için yazma
> `ON CONFLICT DO NOTHING` ile idempotent.

> Maps anahtarı gelene kadar bu da takribî sağlayıcıyla çalışacak
> (bkz. [ANAHTARLAR.md](../ANAHTARLAR.md) #1).

### Neden önemli
Boş dönüş, taşıyıcı için **sıfır gelirli maliyet**. Onu doldurmak:
- taşıyıcının sefer başına kârını artırıyor,
- yük sahibine daha düşük fiyat verilmesini mümkün kılıyor,
- platformun her iki tarafa da tek cümlede anlatabileceği bir vaadi oluyor.

Tasarımdaki `%[XX]` oranı **henüz kaynaklandırılmadı**. Doğrulanmamış bir istatistiği
kesin rakam gibi yayınlamak, ürünün ana iddiasını zayıflatır — kaynak bulunana kadar
yer tutucu kalmalı.

---

## 4. Kapsam: 3 il → 81 il

En büyük operasyonel değişiklik. Etkiler:

| Alan | Değişiklik |
|---|---|
| `districts` tablosu | 51 ilçe → 81 il (+ ilçeler). İl düzeyi yeterli olabilir; ilçe yalnızca büyük şehirlerde. |
| Tarifeler | Şehir bazlı çarpan 81 il için sürdürülemez. **Mesafe kademeleri** öne çıkıyor, il çarpanı yalnızca büyükşehirlerde. |
| Hizmet bölgesi kontrolü | "60 km yarıçap" mantığı düşer; il listesi yeterli. |
| Şehirlerarası reddi | `InterCityNotSupportedException` **kaldırılmalı** — artık ana kullanım bu. |
| Eşleştirme | Anlık dispatch yarıçapı anlamsız; koridor ve ilan modeli geçerli. |

> ✅ Şehirlerarası kısıt kaldırıldı (V8). Rota sağlayıcısı 40 km üstü bacaklarda otoyol
> modeli kullanıyor (dolambaç ×1,22, 70 km/sa); tarife alış ilinden, yoksa ulusal
> varsayılandan ('00') seçiliyor.

---

## 5. Yapılacaklar sırası

| # | İş | Durum |
|---|---|---|
| 1 | Marka, tasarım sistemi, ana sayfa | ✅ tamam |
| 2 | Araç filosu (motokurye → tır, TIR "yakında") | ✅ tamam |
| 3 | Şehirlerarası kısıtını kaldır, 81 il verisi | ✅ tamam (V8; il merkezleri geçici, ilçeler 3 ilde) |
| 4 | Tarife modelini mesafe kademeli hâle getir | ✅ V6 kademeler + V8 ulusal varsayılan tarife |
| 5 | `LoadListing` + `CarrierOffer` (teklif pazarı) | ✅ tamam (V9; ilan → teklif → kabul → iş) |
| 6 | `Corridor` + `CorridorMatch` (boş dönüş) | ✅ tamam (V11; eşleştirme, puanlama, taşıyıcı ekranı) |
| 7 | Taşıyıcı belge yükleme (kamerayla) | ✅ tamam (V12; başvuru, belge, onay kuyruğu, süre takibi) |
| 8 | Teslimatta onay + e-irsaliye | ✅ aşama makinesi + POD + onay (V10) · ⏳ sıradaki: teslim fotoğrafı, e-irsaliye |

### Belge doğrulama — uygulamada bilinmesi gerekenler

- **Başvuru uçları `/driver` altında değil.** Kayıt olan herkes yük veren olarak başlıyor;
  DRIVER rolü ancak onaydan sonra veriliyor. Uçlar `/driver/**` altında olsaydı başvurmak
  için zaten taşıyıcı olmak gerekirdi.
- **Onay, Keycloak'ta rolü atamıyor.** `CarrierApproved` olayı yayınlanıyor ama rol atama
  bir yönetim istemcisi istiyor (ANAHTARLAR.md #19); o gelene kadar operasyon rolü elle
  veriyor. Ekranda kullanıcıya da bu söyleniyor.
- **Zorunlu belge listesi araç tipine bağlı.** SRC ve K belgesi yalnızca kapasite sırası
  3 ve üstü araçlarda isteniyor; motokuryeden istemek başvuruyu boşuna kilitlerdi.
  Kural tek yerde (`DocumentKind.requiredFor`), arayüz kendi kopyasını tutmuyor.
- **Belgeye dokunmak onayı düşürür.** Onaylı bir taşıyıcı belgesini değiştirdiğinde
  başvuru taslağa dönüyor; aksi hâlde doğrulanmamış belgeyle iş almaya devam ederdi.
- **Dosyalar veritabanında değil.** Nesne deposunda (yerelde MinIO); veritabanında yalnızca
  anahtar var. Kovaya doğrudan erişim yok, indirme sahiplik ya da operasyon kontrolünden
  geçiyor.

---

## 6. Açık sorular

1. ~~**Pazarlık kalıyor mu?**~~ **Karar: tek turlu teklif** (tasarım metni esas alındı).
   Bir taşıyıcı bir ilana tek fiyat verir; karşı teklif yok, geri çekip yeniden verebilir.
   docs/10 çok turlu pazarlık askıya alındı.
2. **Tahmini fiyat aralığı nasıl üretilecek?** Kesin fiyat taşıyıcıdan geliyorsa,
   platformun gösterdiği aralık neye dayanacak — tarife mi, geçmiş teklif ortalaması mı?
3. **81 il aynı anda mı açılacak?** Arz olmayan illerde ilan açık kalıp teklif almazsa
   deneyim kötü olur. Kademeli açılış (koridor bazlı) daha güvenli olabilir.
4. **Güven panosu (docs/09) kalıyor mu?** Tasarımda yok ama komisyonsuz dönem stratejisiyle
   uyumluydu.
