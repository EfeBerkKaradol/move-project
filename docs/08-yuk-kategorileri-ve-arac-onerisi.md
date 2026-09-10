# 08 — Yük Kategorileri ve Araç Öneri Motoru

> Bu, ürünün en ayırt edici mekaniği. Kullanıcı "hangi araç lazım?" sorusuna cevap veremez —
> bu soruyu ona hiç sormuyoruz. Ne taşıyacağını soruyoruz, aracı biz öneriyoruz.

## 1. Akış

```
Hizmet modeli seçimi
   ┌──────────────┐  ┌──────────────┐
   │ Anlık taşıma │  │ Planlı taşıma│
   └──────┬───────┘  └──────┬───────┘
          └────────┬─────────┘
                   ▼  panel açılır
        ┌────────────────────────────┐
   1.   │  NE TAŞIMAK İSTİYORSUNUZ?  │   8 kategori, görsel ölçek referanslı
        └────────────┬───────────────┘
                     ▼
        ┌────────────────────────────┐
   2.   │  DETAYLANDIRMA             │   kategoriye özel: eşya seçimi / adet /
        │  (kategoriye göre değişir) │   ev tipi / palet sayısı
        └────────────┬───────────────┘
                     ▼
        ┌────────────────────────────┐
   3.   │  TAHMİN                    │   hacim (m³) · ağırlık (kg) · en uzun kenar (cm)
        └────────────┬───────────────┘
                     ▼
        ┌────────────────────────────┐
   4.   │  ARAÇ ÖNERİSİ              │   1 birincil + 1-2 alternatif, her biri
        │  "neden bu araç" açıklamalı│   gerekçesiyle
        └────────────┬───────────────┘
                     ▼
              adres → fiyat → sipariş
```

Kritik tasarım ilkesi: **kullanıcı istediğinde öneriyi ezip başka araç seçebilir**,
ama seçtiği araca yükünün sığmayacağını hesapladıysak açıkça uyarırız
("Seçtiğiniz Doblo'ya 200 cm'lik yatak sığmaz — sürücü işi reddedebilir").

---

## 2. Araç filosu

Kısa kasa / uzun kasa gibi teknik ayrımlar yerine Türkiye'de herkesin bildiği isimler
kullanılıyor. Kullanıcı "orta panelvan" demez, "transporter" der.

| Kod | Ad | Hacim | Taşıma kapasitesi | Kasa iç uzunluğu | Tipik iş |
|---|---|---|---|---|---|
| `MOTOR` | Motor | 0,1 m³ | 25 kg | 45 cm | Evrak, numune, küçük paket, yemek |
| `DOBLO` | Doblo | 3 m³ | 600 kg | 170 cm | 3-5 koli, çamaşır makinesi, küçük mobilya |
| `TRANSPORTER` | Transporter | 6,5 m³ | 1.000 kg | 260 cm | Buzdolabı, ikili koltuk, 10-15 koli |
| `TRANSIT` | Transit | 11 m³ | 1.500 kg | 330 cm | Bir oda eşyası, koltuk takımı, çift yatak |
| `KAMYONET` | Kamyonet | 20 m³ | 2.700 kg | 430 cm | 1+1 / 2+1 ev eşyası, 3-4 palet |
| `KAMYON` | Kamyon | 45 m³ | 10.000 kg | 720 cm | 3+1 / 4+1 ev eşyası, 8-10 palet, inşaat malzemesi |
| `TIR` | Tır | 90 m³ | 24.000 kg | 1.360 cm | Tam yük, 33 palet, depo/fabrika sevkiyatı |

Bu değerler `vehicle_types` tablosunda tutulur ve operasyon panelinden güncellenebilir —
kodda sabit değildir. Firmalarla yapılan birim fiyat görüşmelerinde araç tanımları
netleştikçe burası güncellenir.

---

## 3. Kategoriler

Panelde kartlar **küçükten büyüğe** sıralı. Her kartta üç şey var: ikon/illüstrasyon,
somut bir ölçek referansı ve tipik hacim aralığı. Ölçek referansı soyut m³ değerinden
çok daha iyi anlaşılıyor.

| Kod | Kategori | Ölçek referansı | Tahmini hacim | Varsayılan araç |
|---|---|---|---|---|
| `BELGE_PAKET` | Zarf & küçük paket | Sırt çantasına sığar | < 0,1 m³ | Motor |
| `KOLI` | Koli & orta paket | Tek kişi taşıyabilir | 0,1 – 1 m³ | Doblo |
| `TEKIL_ESYA` | Tek büyük eşya | İki kişi taşır, arabaya sığmaz | 0,8 – 3 m³ | Transporter |
| `ODA` | Oda dolusu eşya | Öğrenci / stüdyo taşınması | 3 – 10 m³ | Transit |
| `EV` | Ev dolusu eşya | 1+1'den 4+1'e | 10 – 45 m³ | Kamyonet / Kamyon |
| `TICARI` | Ticari yük & palet | Mağaza stoğu, toptan sevkiyat | 1 – 90 m³ | Kamyonet ve üstü |
| `INSAAT` | İnşaat & hacimli malzeme | Kereste, alçıpan, demir, kum | 2 – 45 m³ | Kamyonet / Kamyon |
| `OZEL` | Özel / tarif edeceğim | Piyano, kasa, motosiklet, sanat eseri | değişken | Operasyon belirler |

### Neden bu sekiz?
- **Boyut ekseninde tam kapsama:** Zarf'tan tıra kadar boşluk yok, her talep bir yere düşüyor.
- **Kullanıcının kendi dilinde:** "Ev dolusu eşya" diye düşünülür, "22 m³" diye değil.
- **Fiyatlamayı farklılaştırıyor:** İnşaat malzemesi ve ticari palet aynı hacimde bile
  farklı hamaliye ve araç donanımı (damper, kayış, branda) gerektiriyor.
- **`OZEL` bir kaçış kapısı:** Sınıflandırılamayanı zorla kutuya sokmak yerine operasyona
  yönlendiriyoruz. Bu kategori aynı zamanda ürün araştırması: burada ne birikirse
  bir sonraki kategori odur.

---

## 4. İkinci adım: detaylandırma

Kategori seçimi kaba bir aralık verir; araç önerisinin doğru olması için daraltmak gerekir.
Her kategorinin kendi detay formu var.

| Kategori | Sorulan |
|---|---|
| `BELGE_PAKET` | Paket adedi · tahmini ağırlık (< 5 kg / 5-25 kg) |
| `KOLI` | Koli adedi (1-5 / 6-10 / 11-20 / 20+) · koli boyutu (küçük / standart / büyük) |

> **Paket boyutu kategoriye bağlı.** "3 paket" cevabı zarf kategorisinde 0,02 m³'lük
> küçük paket, koli kategorisinde 0,12 m³'lük standart koli demek. Bu eşleşme
> `cargo_categories.default_package_item_code` sütununda tutulur ve operasyon
> panelinden ayarlanabilir.
| `TEKIL_ESYA` | **Eşya kataloğundan çoklu seçim + adet** (aşağıda) |
| `ODA` | Oda tipi (stüdyo / tek oda) · eşya yoğunluğu (az / orta / çok) |
| `EV` | Ev tipi (1+0 / 1+1 / 2+1 / 3+1 / 4+1) · eşya yoğunluğu · kat & asansör |
| `TICARI` | Palet sayısı **veya** koli sayısı · toplam ağırlık · istifleme gereksinimi |
| `INSAAT` | Malzeme tipi (kereste / alçıpan / demir / kum-çakıl / mermer-fayans) · tonaj veya m³ |
| `OZEL` | Serbest açıklama + fotoğraf → tahmini aralık verilir, kesin fiyat operasyondan |

### Eşya kataloğu (`TEKIL_ESYA` ve `ODA` için)

Her eşyanın hacmi, ağırlığı ve **en uzun kenarı** var. En uzun kenar kritik: 200 cm'lik bir
yatak, hacim olarak Doblo'ya sığsa bile fiziksel olarak sığmaz.

| Eşya | Hacim m³ | Ağırlık kg | En uzun kenar cm |
|---|---|---|---|
| Buzdolabı (no-frost) | 0,80 | 90 | 180 |
| Çamaşır makinesi | 0,35 | 70 | 85 |
| Bulaşık makinesi | 0,32 | 50 | 85 |
| Fırın / ocak | 0,30 | 40 | 85 |
| Klima (iç + dış ünite) | 0,20 | 35 | 110 |
| Televizyon (55") | 0,15 | 20 | 130 |
| İkili koltuk | 0,90 | 45 | 160 |
| Üçlü koltuk | 1,30 | 60 | 220 |
| Koltuk takımı (3+1+1) | 3,20 | 150 | 220 |
| Kanepe / çekyat | 1,00 | 50 | 200 |
| Tek kişilik yatak | 0,45 | 30 | 200 |
| Çift kişilik yatak | 0,90 | 55 | 200 |
| Baza (çift) | 0,90 | 60 | 200 |
| Gardırop (2 kapılı) | 1,20 | 80 | 200 |
| Gardırop (4 kapılı) | 2,40 | 150 | 240 |
| Yemek masası | 0,80 | 40 | 180 |
| Sandalye | 0,15 | 6 | 95 |
| Çalışma masası | 0,50 | 30 | 140 |
| Kitaplık | 0,70 | 45 | 180 |
| Bisiklet | 0,35 | 15 | 180 |
| Piyano (duvar tipi) | 1,10 | 250 | 150 |
| Küçük paket / zarf | 0,02 | 2 | 35 |
| Standart koli | 0,12 | 12 | 60 |
| Büyük koli | 0,25 | 20 | 80 |

Katalog `cargo_items` tablosunda; operasyon panelinden genişletilebilir. `OZEL` kategorisinde
biriken taleplere göre büyüyecek.

---

## 5. Öneri motoru

Kural tabanlı, deterministik. Makine öğrenmesi yok — veri yok, ihtiyaç da yok,
ve kullanıcıya "neden bu araç" diye açıklayamayan bir sistem güven vermez.
Bkz. [ADR-0007](adr/0007-arac-oneri-motoru.md).

### Tahmin
```
V_ham   = Σ (eşya.hacim × adet)
V       = V_ham × 1,25            // istifleme kaybı — eşyalar mükemmel yerleşmez
W       = Σ (eşya.ağırlık × adet) × 1,05
L       = max (eşya.enUzunKenar)
```

Kategori bazlı sabit tahminler (`ODA`, `EV`, `TICARI`, `INSAAT`) katalog toplamı yerine
tablo değerini kullanır:

| Girdi | V (m³) | W (kg) |
|---|---|---|
| Stüdyo, az eşya | 5 | 400 |
| Stüdyo, orta | 7 | 600 |
| 1+1, orta | 12 | 1.100 |
| 2+1, orta | 18 | 1.800 |
| 2+1, çok | 24 | 2.400 |
| 3+1, orta | 28 | 2.900 |
| 3+1, çok | 36 | 3.800 |
| 4+1, orta | 40 | 4.200 |
| Palet (standart, 1 adet) | 1,8 | 400 |

### Seçim
```
uygunlar = araçlar.filtre(a =>
              a.hacim      ≥ V  ∧
              a.kapasiteKg ≥ W  ∧
              a.iççUzunluk ≥ L )

birincil     = uygunlar.enKüçük           // en küçük uygun araç = en ucuz
alternatif_1 = uygunlar.birSonraki        // "daha rahat sığar, yükleme kolaylaşır"
alternatif_2 = küçükAraç × 2 sefer        // toplam fiyat birincilden ucuzsa göster
```

### Ek hizmet önerisi (öneriyle birlikte çıkar)
```
hamaliye öner   ← tek eşya > 60 kg  ∨  V > 3 m³  ∨  (kat > 1 ∧ asansör yok)
branda öner     ← kategori = INSAAT
kayış/sabitleme ← kategori ∈ {TEKIL_ESYA, TICARI}  ∧  kırılgan işaretli
ambalaj öner    ← kategori ∈ {ODA, EV}
```

### Uygun araç yoksa
`V` veya `W` tırın kapasitesini aşıyorsa: çoklu sefer önerisi + operasyona yönlendirme.
`OZEL` kategorisinde ise doğrudan operasyon fiyatlandırması.

---

## 6. Öneri ekranının anatomisi

Öneri, gerekçesiyle birlikte gösterilir. "Transporter" demek yeterli değil —
kullanıcı neden Doblo olmadığını anlamalı, yoksa daha ucuz olanı seçip iş bozulur.

```
┌──────────────────────────────────────────────────────┐
│  Yükünüz için önerimiz                               │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ ✓ TRANSPORTER                    ~640 ₺        │  │  ← birincil, seçili
│  │   6,5 m³ · 1.000 kg · 260 cm kasa               │  │
│  │                                                 │  │
│  │   [████████░░░░]  Yükünüz aracın %72'sini      │  │  ← doluluk göstergesi
│  │                    dolduruyor                   │  │
│  │                                                 │  │
│  │   Buzdolabı + çamaşır makinesi + 8 koli         │  │
│  │   ≈ 4,7 m³ · 320 kg · en uzun parça 180 cm      │  │
│  │                                                 │  │
│  │   Doblo'ya sığmaz: 180 cm'lik buzdolabı         │  │  ← neden bir alt araç değil
│  │   170 cm'lik kasaya girmiyor.                   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │   TRANSIT                        ~780 ₺        │  │  ← alternatif
│  │   11 m³ · daha rahat yükleme, %43 doluluk       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Önerilen ek hizmet:  ⊕ Hamaliye  (+120 ₺)          │
│  Buzdolabı 90 kg — asansörsüz 3. kat için önerilir.  │
│                                                      │
│  [ Başka bir araç seçmek istiyorum ]                 │
└──────────────────────────────────────────────────────┘
```

**Doluluk göstergesi** bu ekranın kalbi. Kullanıcı m³ okumaz ama dolu bir çubuk görür ve
"tamam, sığıyor" der. %95 üstünde uyarı rengine döner ve bir üst aracı önerir.

**Fiyat önerinin içinde** — ayrı bir adımda değil. Kullanıcı araç seçimini fiyatla birlikte
yapar; referans ürünlerin en iyi yaptığı şey bu.

---

## 7. Ölçüm ve kalibrasyon

Öneri motorunun doğruluğu ölçülmeden iyileşmez. Faz 2'den itibaren toplanacak:

| Metrik | Ne söyler |
|---|---|
| Öneriyi ezip başka araç seçme oranı | Öneri güveni |
| Sürücünün "yük sığmadı" bildirimi | Tahmin düşük kalmış |
| Sürücünün "araç fazla büyük" bildirimi | Tahmin yüksek kalmış, müşteri fazla ödemiş |
| Kategori bazlı iptal oranı | Hangi kategoride beklenti karşılanmıyor |
| `OZEL` kategorisinde biriken talepler | Yeni kategori adayları |

Sürücü uygulamasında işi kabul ettikten sonra tek dokunuşluk geri bildirim:
**"Yük tahmini doğru muydu?"** → *Doğru / Fazla büyük araç / Yük sığmadı*.
Bu tek soru, katsayıları kalibre etmek için gereken en değerli veri.

---

## 8. İlanda yük beyanı ve fotoğraf

Fiyat akışındaki tarif tahmin içindi ve ilana taşınmıyordu; ilan araç sahibine tek
satır serbest metinle gidiyordu ("buzdolabı, çamaşır makinesi ve 8 koli"). Teklif,
görülmemiş bir yüke veriliyordu ve iş kapıda bozuluyordu.

İlan artık **beyansız ve fotoğrafsız yayınlanamıyor**.

Beyan ve fotoğraf **fiyat adımında**, üye olmadan isteniyor; ilan adımı ikisini de
devralıyor. Tarif eskiden araç seçiminin yanında bir bağlantıydı ve ziyaretçi aracı
yükünü anlatmadan seçiyordu — öneri motoru çoğu kullanıcıya hiç çalışmıyordu. Sıra
artık akışın kendisi: rota → zaman → **yük** → araç. Tahmin de ancak bunlar
tamamlanınca gösteriliyor; yarım beyanla verilen rakam kullanıcının aklında "fiyat"
diye kalıyor ve teklifler geldiğinde aradaki fark pazarlık değil güven sorunu
yaratıyor.

### Beyan

Kalemler aynı katalogdan seçiliyor (`cargo_items`), adetleriyle. Araç tipi hangi
kalemlerin gösterileceğini belirliyor:

| Araç | Gösterilen kategoriler |
|---|---|
| Motor … kamyonet | Tekil eşya, koli, zarf |
| Kamyon, TIR | Komple yük (palet, tomruk, big-bag, makine, karışık kargo) |

Kamyona gelen kullanıcı ev eşyası taşımıyor; ona koltuk listesi göstermek, aradığı
paleti otuz kalem arasında aratmak olurdu.

Beyan ilana **kopyalanıyor**, katalog kaydına atıf yapılmıyor: kalemin adı ya da hacmi
sonradan güncellenirse yayınlanmış ilanın beyanı değişmemeli. Fiyat snapshot'ı ile aynı
gerekçe (docs/04). Hacim ve ağırlık istemciden alınmıyor — alınsaydı kullanıcı yükünü
olduğundan küçük göstererek ucuz araca sığdırabilirdi.

`DIGER_ESYA` bir çıkış kapısı: beyan zorunlu olduğu için katalogda karşılığı olmayan
bir eşya kullanıcıyı kilitlememeli. Orta boy sayılıyor, tarifi metin alanına yazılıyor.

**Araç uyarısı** seçim sırasında çalışıyor: en uzun kenar kasadan uzunsa, ağırlık
kapasiteyi aşıyorsa ya da hacim kasanın %90'ını geçiyorsa uyarı çıkıyor. Engellemiyor —
kalem hacimleri yaklaşık ve "sığmaz" demek yanlış olabilir; kararı kullanıcı veriyor.

### Fotoğraf

En az bir kare zorunlu, en çok on. Fotoğraf beyanın yalanlanamayan hâli: "iki koltuk"
yazan ilanla gelen araç sahibi koltuğun kapıdan çıkmadığını yerinde öğreniyordu.

Kareler **ilandan önce** yükleniyor (`POST /listing-photos`) ve yayın anında
iliştiriliyor. Alternatifi yayın isteğine dosyaları da koymaktı; o zaman kullanıcı
yayınlamadan önce ne yüklediğini göremez, yanlış kareyi tek tek silemezdi. Bedeli,
iliştirilmeden kalan yüklemeler — saatlik bir iş 24 saatten eskileri siliyor.

Fiyat adımında seçilen kareler **sunucuya gitmiyor**: kimlik daha belli değil.
Tarayıcıda (IndexedDB) bekliyorlar ve ilan adımında, giriş yapılmış hâlde
yükleniyorlar. Anonim bir yükleme ucu açılmadı — iki gerekçe de kalıcı: hiç üye
olmayacak bir ziyaretçinin evinin fotoğrafını depoya almak, sonra silmek zorunda
kalacağımız kişisel veri biriktirmektir; ve kimlik istemeyen bir dosya ucu, depoyu
doldurmanın ve barındırmak istemediğimiz içeriği bize koydurmanın hazır yoludur.
Bedeli: kullanıcı fiyatı telefonda alıp ilanı bilgisayardan yayınlarsa kareleri
yeniden seçiyor.

Öneri **beyandan** çıkıyor, fotoğraftan değil. Tasarımdaki "fotoğraf çekin, sistem
aracı önersin" fikri bu motora dayanıyor; görüntüden eşya çıkaran bir servis
bağlanmadı. Bağlanacaksa ADR-0005 geçerli: bu kareler birinin evinin içi, yurt
dışına gönderilemez.

**Kim görüyor:**

| | Beyan ve fotoğraflar |
|---|---|
| İlan sahibi | Her zaman |
| Onaylı araç sahibi, ilan açıkken | Görüyor — teklifi buna bakarak veriyor |
| Onaylı araç sahibi, iş verildikten sonra | Yalnızca işi alan |
| Herkese açık yüzey (güven panosu) | Hiçbir zaman |

Kural tek yerde (`CarrierVisibility`): ilan detayı ile fotoğrafın ayrışması, üstverisi
gizlenmiş bir ilanın fotoğrafının açık kalmasına yol açardı.

Formda kullanıcıya ne çekeceği söyleniyor: **eşyanın kendisi, kimlik/adres/yüz değil.**
Karelerin kimlerin göreceği aynı cümlede yazıyor — sonradan öğrenilen bir görünürlük,
verilmemiş bir rızadır.

---

## 9. İlan detayında konum ve iletişim (V23)

Araç sahibi teklif verirken yalnızca ilçeyi görüyordu: "Kadıköy" yolun ne kadarını
çıkacağını söylemiyor. Kullanıcı adres alanında mahalleyi zaten seçiyordu
("İstanbul, Kadıköy - Caferağa") ama o bilgi ilçeye çevrilirken atılıyordu.

**Semt** artık ilana yazılıyor ve teklif aşamasında görünüyor. Tam adres ve kapı
numarası hâlâ **toplanmıyor**; iş verildikten sonra taraflar arasında paylaşılıyor.

**İletişim** teklif aşamasında maskeli: ad ve `+90 5** *** ** 67`. Numaranın ham
hâli `ordering` modülüne hiç girmiyor — `identity` maskeleyerek veriyor
(`PhoneDirectory.maskedVerifiedPhone`). Sızdıramayacağımız bir veriyi korumak
zorunda değiliz.

| | İlçe | Semt | Ad | Telefon | Tam adres |
|---|---|---|---|---|---|
| Herkese açık yüzey | ✓ | — | — | — | — |
| Onaylı araç sahibi, ilan listesi | ✓ | ✓ | — | — | — |
| Onaylı araç sahibi, ilan detayı | ✓ | ✓ | ✓ | maskeli | — |
| İşi üstlenen araç sahibi | ✓ | ✓ | ✓ | tam | ✓ |

İletişim **listede taşınmıyor**, yalnızca detayda: taşınsaydı tek istekle yüz
ilanın adı ve numarası dışarı çıkardı. Sızdırma, bir ekranın veriyi göstermesiyle
değil yanıtın onu taşımasıyla olur — test bunu bağlıyor.
