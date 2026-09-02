# 10 — Pazarlık (müşteri ↔ nakliyeci fiyat müzakeresi)

> Türkiye'de nakliye zaten pazarlıkla yapılıyor. Bunu yok saymak yerine dijitalleştirip
> şeffaf ve kayıt altına alınmış hâle getiriyoruz. Fark şu: telefonda pazarlıkta müşteri
> tek bir nakliyeciyle konuşur; burada aynı anda onlarcasıyla konuşur.

## 1. Konum: pazarlık opsiyoneldir

Sipariş özeti ekranında iki eşit olmayan aksiyon var:

```
┌──────────────────────────────────────────────┐
│  Transporter · Kadıköy → Beşiktaş            │
│                                              │
│  Önerilen fiyat              640 ₺           │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │        Hemen sipariş ver               │  │  ← birincil
│  │   ~2 dakikada araç bulunur             │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [ Pazarlık yap ]                            │  ← ikincil
│  Kendi fiyatını öner, nakliyeciler yanıtlasın│
│  Ortalama %11 tasarruf · ~6 dk sürer         │
└──────────────────────────────────────────────┘
```

**Neden birincil değil:** Acelesi olan kullanıcı pazarlık istemez, "hemen gelsin" ister.
Pazarlığı varsayılan yapmak anlık taşımayı anlık olmaktan çıkarır. Pazarlık, fiyata
duyarlı ve zamanı olan kullanıcı için ikinci bir yol.

**Beklenen süre ve ortalama tasarruf açıkça yazılır** — kullanıcı ne karşılığında ne
verdiğini bilerek seçsin.

---

## 2. Akış

```
Müşteri                    Platform                      Nakliyeciler
   │                          │                                │
   │  "Pazarlık yap"          │                                │
   │  teklif: 540 ₺  ────────►│                                │
   │                          │ taban kontrolü (≥ %70)         │
   │                          │ uygun havuzu belirle           │
   │                          ├───── teklif yayını ───────────►│  (aynı anda
   │                          │                                │   tüm uygun
   │                          │◄──── kabul / karşı teklif ─────┤   sürücülere)
   │                          │                                │
   │◄─ 3 karşı teklif ────────┤  580₺ ★4.9 · 560₺ ★4.6         │
   │   + 1 doğrudan kabul     │  600₺ ★5.0 · 540₺ kabul ★4.3   │
   │                          │                                │
   │  birini seç  ───────────►│                                │
   │                          ├──── atama ────────────────────►│
   │                          │                                │
   ▼                          ▼                                ▼
              sipariş DRIVER_ASSIGNED durumuna geçer
```

### Tur yapısı
| Tur | Kim | Ne yapar |
|---|---|---|
| 1 | Müşteri | Kendi fiyatını önerir |
| 2 | Nakliyeciler | Kabul eder, karşı teklif verir veya geçer |
| 3 | Müşteri | Gelen tekliflerden birini kabul eder **veya** tek bir son teklif verir |
| 4 | Nakliyeciler | Son tekliflere yanıt |

**En fazla 4 tur.** Sonsuz pazarlık hem kullanıcıyı yorar hem aracı işgal eder.
4. tur sonunda anlaşma yoksa pazarlık kapanır.

### Süre pencereleri
| Hizmet modeli | Pazarlık süresi | Gerekçe |
|---|---|---|
| Anlık taşıma | **6 dakika** | Daha uzunu "anlık" olmaktan çıkarır |
| Planlı taşıma | **2 saat** (randevuya >24 saat varsa **12 saat**) | Aciliyet yok, daha çok teklif toplanabilir |

Süre dolduğunda müşteriye üç seçenek sunulur: *önerilen fiyata dön* · *teklifi yükselt* ·
*iptal et*.

---

## 3. Sınırlar — pazarlığın dibe doğru yarışa dönmemesi için

Serbest pazarlık, kontrolsüz bırakılırsa sürücü maliyetinin altına iner. Sürücü kaybeder,
işi bırakır, arz çöker ve platform güvenilirliğini yitirir. Sınırlar bu yüzden var:

| Sınır | Değer | Neden |
|---|---|---|
| **Müşteri teklif tabanı** | Referans fiyatın **%70'i** | Bu eşiğin altı, firmalarla anlaşılan birim fiyatın altına düşer — hiçbir nakliyeci kabul etmez, kullanıcı boşuna bekler |
| **Nakliyeci karşı teklif tavanı** | Referans fiyatın **%130'u** | Fırsatçılığı ve acil durumda sömürüyü engeller |
| **Minimum artış adımı** | 10 ₺ | 1 ₺'lik karşı tekliflerle tur harcanmasın |
| **Nakliyeci başına teklif** | Tur başına 1 | Spam engeli |

Taban ve tavan yüzdeleri `negotiation_policy` tablosunda; şehir ve araç tipi bazında
ayarlanabilir. Firmalarla yapılan birim fiyat görüşmeleri sonuçlandıkça kalibre edilecek.

**Müşteriye taban açıkça söylenir:**
> Bu taşıma için en düşük teklif **448 ₺**. Daha düşüğü nakliyecinin maliyetinin altında
> kalıyor ve kabul edilmiyor.

Gizli bir tabana çarpıp "teklifiniz reddedildi" mesajı almak kötü bir deneyim; sınırı
baştan göstermek hem dürüst hem daha hızlı.

---

## 4. Nakliyeci tarafı

Sürücü uygulamasında pazarlık teklifleri **normal iş tekliflerinden ayrı bir sekmede**
görünür. Sebep: anlık iş teklifi 15 saniyelik bir karardır, pazarlık teklifi değerlendirme
gerektirir; ikisini aynı akışa koymak sürücüyü yanıltır.

```
┌────────────────────────────────────────────┐
│  PAZARLIK TEKLİFİ            5:12 kaldı    │
│                                            │
│  Kadıköy → Beşiktaş · 9,2 km               │
│  Transporter · Tek büyük eşya              │
│  Buzdolabı + çamaşır makinesi + 8 koli     │
│  Alış: 3. kat, asansör yok                 │
│                                            │
│  Sistem fiyatı        640 ₺                │
│  Müşteri teklifi      540 ₺   (−%16)       │
│                                            │
│  Bu güzergâhta ortalama kazancın: 585 ₺    │  ← sürücüye bağlam
│  Şu an 7 nakliyeci daha görüyor             │
│                                            │
│  [ Kabul et 540 ₺ ]  [ Karşı teklif ]      │
│  [ Geç ]                                   │
└────────────────────────────────────────────┘
```

Sürücüye **bağlam veriyoruz**: kendi ortalama kazancı ve kaç rakibin gördüğü.
Bilgisiz pazarlık, sürücünün zararına sonuçlanır ve uzun vadede platformu zayıflatır.

**Karşı teklif verirken** kısa bir gerekçe seçebilir (opsiyonel, müşteriye gösterilir):
*asansör yok, hamaliye gerekiyor · trafik yoğun saat · uzak mesafe dönüşü boş*.
Gerekçeli karşı teklifin kabul oranı gerekçesizden belirgin şekilde yüksek olacaktır.

---

## 5. Teklif karşılaştırma ekranı (müşteri)

Gelen teklifler **sadece fiyata göre** sıralanmaz — en ucuz her zaman en iyi değil.

```
┌──────────────────────────────────────────────────────┐
│  4 nakliyeci yanıtladı            4:38 kaldı         │
│  Sırala: [ Önerilen ] Fiyat · Puan · Varış           │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ ÖNERİLEN   Mehmet A.  ★4,9 (312)   580 ₺     │    │
│  │            12 dk uzakta · Transporter        │    │
│  │            "Asansör yok, hamaliye dahil"     │    │
│  │            [ Kabul et ]                      │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  Hasan Y.   ★4,3 (58)    540 ₺  ✓ teklifini kabul   │
│             24 dk uzakta                             │
│                                                      │
│  Ali D.     ★5,0 (147)   600 ₺   8 dk uzakta        │
│  Murat K.   ★4,6 (203)   560 ₺  18 dk uzakta        │
│                                                      │
│  [ Son teklif ver ]   [ Önerilen fiyata dön 640 ₺ ]  │
└──────────────────────────────────────────────────────┘
```

**"Önerilen" rozeti** fiyat, puan ve varış süresinin bileşik skoru — en ucuz olmayabilir.
Nasıl hesaplandığı bir bilgi balonunda açıklanır; gizli bir sıralama güveni bozar.

---

## 6. Güven panosuyla ilişkisi

Bireysel sipariş tutarları panoda yayınlanmıyor ([09](09-guven-panosu.md), kural 11).
Ama pazarlığın **toplu** istatistiği güçlü bir çekim unsuru:

> Pazarlık yapan müşteriler ortalama **%11 tasarruf** etti · Son 30 günde **1.847** pazarlık

Bu sayı gerçek olmalı ve düşerse düşük gösterilmeli. Şişirilmiş bir tasarruf oranı,
ilk pazarlığında %2 kazanan kullanıcıda tam ters etki yapar.

---

## 7. Domain ve durum makinesi

```
Negotiation         id, orderId, status, referencePrice, floorPrice, ceilingPrice,
                    currentRound, maxRounds, expiresAt, acceptedOfferId?,
                    createdAt, closedAt
NegotiationOffer    id, negotiationId, round,
                    party(CUSTOMER|DRIVER), driverId?,
                    amount, reasonCode?, note?,
                    status(ACTIVE|ACCEPTED|SUPERSEDED|REJECTED|EXPIRED),
                    createdAt
NegotiationPolicy   id, cityCode, vehicleTypeCode, serviceModel,
                    floorPercent, ceilingPercent, minStepAmount,
                    maxRounds, windowSeconds, version, validFrom, validTo
```

### Sipariş durum makinesine eklenen dal
```
PLACED ──(pazarlık seçildi)──► NEGOTIATING
                                   │
             ┌─────────────────────┼────────────────────┐
             │ müşteri teklifi     │ süre doldu         │ müşteri iptal
             │ kabul etti          │ / anlaşma yok      │
             ▼                     ▼                    ▼
      DRIVER_ASSIGNED      NEGOTIATION_FAILED    CANCELLED_BY_CUSTOMER
                                   │
                    ┌──────────────┴──────────────┐
                    │ önerilen fiyata dön         │ iptal
                    ▼                             ▼
             SEARCHING_DRIVER            CANCELLED_BY_CUSTOMER
```

Pazarlıkla anlaşılan tutar `Order.quoteSnapshot` içine `negotiatedAmount` ve
`negotiationId` olarak yazılır; orijinal referans fiyat da saklanır — muhasebe ve
uyuşmazlık için ikisi de gerekli.

### Yarış koşulu
Aynı teklifi iki müşteri (çoklu pazarlık senaryosu) veya bir müşteri ile zaman aşımı
aynı anda işleyebilir. Kabul işlemi `dispatch` ile aynı korumayı kullanır:
Redisson lock + `UPDATE ... WHERE status='NEGOTIATING' AND version=?`.

---

## 8. Kötüye kullanım koruması

| Risk | Koruma |
|---|---|
| Müşteri teklif verip sürekli iptal ediyor | Pazarlık başlatma limiti: saatte 5; iptal oranı yüksek kullanıcıya pazarlık kapatılır |
| Sürücüler anlaşıp fiyatı yukarı çekiyor | Tavan sınırı + anormal karşı teklif örüntüsü tespiti + referans fiyat her zaman görünür |
| Sürücü kabul edip sonra iptal ediyor | Normal iptal cezasının üstüne pazarlık iptal cezası; tekrarında pazarlık erişimi kapanır |
| Sahte hesapla teklif şişirme | Puanlama gibi pazarlık da doğrulanmış hesaba bağlı |
| Platform dışına çıkarma (kaçak iş) | Pazarlık aşamasında telefon/adres paylaşılmaz; iletişim yalnızca atama sonrası ve maskeli |

Son madde önemli: pazarlık ekranında sürücünün gerçek telefonu görünürse taraflar
platformu atlar. Pazarlık boyunca iletişim **yalnızca yapılandırılmış teklif ve
gerekçe kodları** üzerinden; serbest metin alanı yok.
