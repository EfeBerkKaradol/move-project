# 12 — Fiyat Araştırması ve Tarife Kalibrasyonu

> Tarih: 5 Eylül 2026. Tarife: `V6__market_rate_cards.sql`, filo revizyonuyla birlikte
> `V7__fleet_revision.sql`. Önceki tarife (V5) "geçici" işaretliydi ve piyasanın 3–5 kat
> altındaydı; bu doküman yeni değerlerin nereden geldiğini kaydeder. Firma birim fiyat
> görüşmeleri sonuçlanınca güncellenir.
>
> **V7 filo revizyonu:** tek "panelvan" basamağı üçe bölündü (mini panelvan · panelvan ·
> minivan), kırkayak kaldırıldı. Aşağıdaki §3–4 tabloları V7 filosunu gösteriyor.

## 1. Yöntem

Tek günlük web taraması, üç kaynak türü:

| Tür | Ne verir | Sapma |
|---|---|---|
| Nakliye firması tarife sayfaları (Ateşnak, Atacan, DNA, Turuncu Kamyonet) | Tam hizmet fiyatı; km/araç bazlı | Yüksek — sigorta, ekip, marka dahil |
| Yük pazarı blogları (Yük Yükle) | Spot navlun; araç sahibinin aldığı | Düşük — boş dönüş, pazarlık |
| Platform iş kayıtları (Armut) | Gerçekleşmiş işler, tarih ve ilçe ile | Karışık — hizmet kapsamı belirsiz |

Konvoy'da kesin fiyatı **araç sahibi teklifle veriyor**, tarife yalnızca kullanıcıya gösterilen
tahmini aralığın çapası (docs/11 §2). Bu yüzden hedef: firma fiyatı ile spot fiyatın **ortası**.
Firma fiyatına yakın olsa ilanlar tekliflerden pahalı görünür ve kullanıcı platforma güvenmez;
spot'a yakın olsa araç sahipleri ilanı beğenmez.

**Not — Martı TAG:** yolcu taşıma uygulaması; fiyat *yapısı* (açılış + km + dakika) bizim
tarife kartıyla aynı, birim fiyatları yük taşımayla karşılaştırılabilir değil. Yapı referans
alındı, rakamlar yük/kurye pazarından.

## 2. Piyasa bulguları (Eylül 2026, ₺)

### Motokurye — İstanbul
- Aynı yaka normal **150–350**, ekspres 250–500, VIP 500–1.000; ilçeler arası ve yaka geçişi ek ([Ateş Kurye](https://ateskurye.com/moto-kurye), [Paket Taxi](https://www.pakettaxi.com/kurye-fiyatlari-nasil-hesaplanir/))
- Bekleme: 5 dk sonrası **9 ₺/dk** ([MS Moto Kurye](https://msmotokurye.com/fiyatlar))
- Armut gerçekleşen işler: 400–2.500, uzun mesafe/il dışı dahil ([Armut](https://armut.com/fiyatlari/moto-kurye_119))

### Panelvan / hafif ticari — şehir içi
- Hafif ticari (Doblo sınıfı) 900–1.200; panelvan (Transporter/Ducato) **1.200–2.500** ([Ateşnak](https://www.atesnak.com/kucuk-nakliye-fiyatlari-hesapla))
- Şehirlerarası kamyonet/panelvan (1–3 t) İstanbul–Ankara **4.500–7.000** ([Yük Yükle](https://yukyukle.tr/bloglar/ankara-istanbul-arasi-yuk-tasima-navlun-fiyatlari-2026))

### Kamyonet (3,5 t)
- Şehir içi (1+1 daire, büyük mobilya) **3.500–7.000** ([Ateşnak](https://www.atesnak.com/kucuk-nakliye-fiyatlari-hesapla)); şehir içi km fiyatı ortalama 25–40 ₺/km ([Elvan Nakliyat](https://www.elvannakliyat.com.tr/nakliye-fiyat-hesaplama/))
- Şehirlerarası **20–30 ₺/km** ([Ateşnak km tarifesi](https://www.atesnak.com/kamyon-nakliye-km-fiyati))
- Armut: yalnız taşıma işleri 1.250–9.000, ambalajlı taşınma 25.000+ ([Armut](https://armut.com/fiyatlari/kamyonet-nakliye_1150))

### Kamyon (10 t)
- Şehirlerarası 10 teker (5–12 t) İstanbul–Ankara **9.000–14.000** spot ([Yük Yükle](https://yukyukle.tr/bloglar/ankara-istanbul-arasi-yuk-tasima-navlun-fiyatlari-2026)); firma tarifesi 6 teker 35–50 ₺/km, 10 teker 55–75 ₺/km ([Ateşnak](https://www.atesnak.com/kamyon-nakliye-km-fiyati))
- Şehir içi "yalnız kamyon/kamyonet" evden eve **7.599'dan** ([İstanbul Nakliyat](https://www.istanbulnakliyat.ist/nakliyat-fiyatlari/)); firma tam hizmet İstanbul–Ankara 21 m³ 44.000 ([Atacan](https://www.atacannakliyat.com/blog/kamyon-km-nakliye-fiyati.html))

### Mini panelvan ve panelvan (van sınıfının alt basamakları)
- Hafif ticari (Fiorino/Courier/Doblo sınıfı) şehir içi **900–1.200** ([Ateşnak](https://www.atesnak.com/kucuk-nakliye-fiyatlari-hesapla))
- Kapasite: Fiorino Cargo **2,5 m³ / 610 kg** ([Parkers](https://www.parkers.co.uk/vans-pickups/fiat/fiorino/2008-dimensions/)); Doblo/Connect sınıfı ~5 m³ / 1 t
- V7'de mini panelvan bu bandın altına, panelvan tam ortasına oturtuldu.

### TIR (24 t)
- Komple tır İstanbul–Ankara **18.000–28.000** ([Yük Yükle](https://yukyukle.tr/bloglar/ankara-istanbul-arasi-yuk-tasima-fiyatlari-ne-kadar-2026)); firma 80–110 ₺/km ([Ateşnak](https://www.atesnak.com/kamyon-nakliye-km-fiyati)); Armut 10.000–68.000 ([Armut](https://armut.com/fiyatlari/tir-nakliye_92982))
- Hizmete açılmadı; arayüzde "Yakında". Tarifesi hazır bekliyor.

> **Kırkayak (18 t) V7'de kaldırıldı.** Ne arz verisi ne fiyat kaynağı bulunabildi; kamyon
> ile tır arasına tahminle yerleştirilmişti. Kamyon 10 t ile TIR 24 t arasındaki boşluk,
> TIR hizmete açılınca gerçek talep verisiyle yeniden değerlendirilecek.

### Ek hizmetler
- Ambalaj/taşıma desteği +1.750–3.500 ([Armut](https://armut.com/fiyatlari/kamyonet-nakliye_1150)); taşıma asansörü 2.000–4.000 ([Taşınırken](https://tasinirken.com/esya-tasima-asansoru-kiralama-fiyatlari/), [Nursoy](https://www.nursoynakliyat.com.tr/asansorlu-nakliyat-fiyatlari/))
- Sezon: yaz/ay sonu/hafta sonu **+%15–25**, acil **+%30** ([Yük Yükle](https://yukyukle.tr/bloglar/ankara-istanbul-arasi-yuk-tasima-navlun-fiyatlari-2026)) — tarifeye konmadı; teklif mekanizması zaten yansıtır.

## 3. Türetilen tarife (Ankara ×1,00; İstanbul ×1,08; Hatay ×0,95)

| Araç | Kapasite | Taban | Dahil km | ₺/km | ₺/dk | Minimum | Bekleme |
|---|---|---|---|---|---|---|---|
| Motor | 30 kg · 0,10 m³ | 125 | 2 | 11 | 1,00 | 195 | 5 dk ücretsiz, 9 ₺/dk |
| Mini panelvan | 600 kg · 2,5 m³ | 480 | 3 | 15 | 1,40 | 720 | 30 dk, 3,0 ₺/dk |
| Panelvan | 1 t · 5 m³ | 640 | 3 | 19 | 1,70 | 950 | 30 dk, 3,6 ₺/dk |
| Minivan | 1,3 t · 8 m³ | 900 | 3 | 24 | 2,20 | 1.300 | 30 dk, 4,4 ₺/dk |
| Kamyonet | 3,5 t · 18 m³ | 2.300 | 3 | 34 | 3,50 | 3.300 | 30 dk, 7 ₺/dk |
| Kamyon | 10 t · 45 m³ | 3.500 | 3 | 46 | 5,00 | 5.600 | 30 dk, 10 ₺/dk |
| TIR *(yakında)* | 24 t · 90 m³ | 5.900 | 3 | 70 | 7,00 | 9.600 | 30 dk, 14 ₺/dk |

Kademeli km: **0–25 km tam · 25–150 km %70 · 150+ km %38.** Taban ücret 30 dk yükleme/boşaltmayı
kapsar; bu yüzden "bekleme" 30 dk sonra başlar (motokuryede 5 dk).

## 4. Kalibrasyon çıktıları

Fiyat motoru formülüyle (`DefaultPricingService`) hesaplandı; takribî rota sağlayıcısı 26 km/sa
şehir içi hız varsayar.

**Şehir içi, İstanbul (₺)**

| Araç | 5 km | 12 km | 20 km | 35 km | 60 km | Piyasa bandı |
|---|---|---|---|---|---|---|
| Motor | 211 | 289 | 404 | 591 | 861 | 150–500 |
| Mini panelvan | 778 | 778 | 871 | 1.133 | 1.502 | 900–1.200 |
| Panelvan | 1.026 | 1.026 | 1.134 | 1.463 | 1.926 | 900–1.200 |
| Minivan | 1.404 | 1.404 | 1.534 | 1.951 | 2.540 | 1.200–2.500 |
| Kamyonet | 3.564 | 3.564 | 3.564 | 3.907 | 4.765 | 3.500–7.000 |
| Kamyon | 6.048 | 6.048 | 6.048 | 6.048 | 6.907 | 7.600'dan (tam gün) |
| TIR | 10.368 | 10.368 | 10.368 | 10.368 | 11.037 | 10.000+ (Armut alt bant) |

**Şehirlerarası, İstanbul–Ankara 455 km (₺)** — 65 km/sa varsayımıyla; şehirlerarası kısıt
kaldırılıp (docs/11 §5 #3) rota sağlayıcısı otoyol hızını tanıyınca geçerli olur.

| Araç | Tarife | Spot (Yük Yükle) | Firma (Ateşnak) |
|---|---|---|---|
| Mini panelvan | 4.484 | — | — |
| Panelvan | 5.680 | 4.500–7.000 | 9.100–13.650 |
| Minivan | 7.289 | 4.500–7.000 | 9.100–13.650 |
| Kamyonet | 11.514 | — | 9.100–13.650 |
| Kamyon | 16.079 | 9.000–14.000 | 15.900–22.750 |
| TIR | 24.783 | 18.000–28.000 | 36.400–50.000 |

Hepsi spot ile firma arasında; TIR spot bandının içinde.

## 5. Sınırlar ve sıradaki adımlar

0. **Van sınıfının basamak sırası doğrulanmalı.** Türkçe nakliye dilinde "panelvan" ve
   "minivan" tutarlı kullanılmıyor; kaynaklar ikisini yer yer eşanlamlı sayıyor. V7'de
   mini panelvan < panelvan < minivan sırası benimsendi. Firma görüşmelerinde bu adlandırma
   teyit edilmeli — sıralama değişirse yalnızca iki satırın kapasite ve tarife değeri değişir.
1. **Tek günlük tarama, kaynaklar pazarlama sayfaları.** Firma görüşmeleri (README: "görüşmeler
   sürüyor") sonuçlanınca sözleşmeli birim fiyatlar bu tabloyu ezer.
2. **Tahmin bandı** (`ESTIMATE_BAND`, ±%10) hâlâ varsayım. Teklifler birikince band, gerçek
   teklif/tarife oranının dağılımından türetilecek (docs/11 açık soru #2).
3. **Şehirlerarası süre** 26 km/sa ile hesaplanınca dakika kalemi şişer. Kısıt kaldırılırken
   `ApproximateRouteProvider` il dışı bacaklarda otoyol hızı kullanmalı.
4. **Sezon ve gün etkisi** tarifede yok; teklif pazarı bunu doğal yansıtır. İleride talep
   katsayısı düşünülebilir (docs/03 dinamik fiyat notu).
5. **Boş dönüş indirimi** (docs/11 §3) tarifede değil, koridor eşleşmesinde uygulanır.
