# 01 — Ürün Gereksinimleri

> Durum: Taslak v2 · Kapsam: MVP + yakın vadeli fazlar
> Marka adı geçici: **Taşıyoruz**

## 1. Problem ve konumlandırma

Türkiye'de yük taşıma talebi (bireysel eşya taşıma, KOBİ mağaza teslimatı, ev taşınması)
büyük ölçüde telefon, WhatsApp grupları ve komisyoncu ağları üzerinden yürüyor. Sonuç:
fiyat şeffaf değil, araç bulma süresi öngörülemez, taşıma sırasında görünürlük sıfır,
kimin güvenilir olduğu bilinmiyor.

**Değer önerisi:** Ne taşıyacağını söyle, aracı biz önerelim; fiyatı baştan gör, istersen
pazarlık et; taşıma boyunca aracı canlı izle; kimin hangi işi nasıl yaptığını herkese
açık panodan gör.

### İlk açılış stratejisi
| | |
|---|---|
| Şehirler | İstanbul · Ankara · Hatay |
| Komisyon | **2027 ilk çeyreğine kadar %0** |
| Fiyat temeli | Nakliye firmalarıyla anlaşılan birim fiyatlar |
| Öncelik | Ciro değil — **tanınırlık ve güven** |

Komisyonsuz dönem arzı çekiyor, güven panosu talebin güvenmesini sağlıyor. İkisi aynı
stratejinin iki yarısı.

### Farklılaşma
- **Araç seçimini kullanıcıya sormuyoruz.** "Ne taşıyacaksın?" diye soruyor, aracı
  hesaplayıp gerekçesiyle öneriyoruz ([08](08-yuk-kategorileri-ve-arac-onerisi.md))
- **Pazarlık dijital ve çok taraflı.** Telefonda tek nakliyeciyle pazarlık edilir;
  burada aynı anda onlarcasıyla ([10](10-pazarlik.md))
- **Güven panosu.** Gerçek siparişler ve gerçek değerlendirmeler, düşük puanlar dâhil,
  herkese açık ([09](09-guven-panosu.md))
- Türkiye'ye özgü: telefon + OTP giriş, e-Arşiv fatura, K belgesi doğrulama,
  kapıda nakit/kart, KVKK uyumlu konum saklama, Türkiye'de barındırma

## 2. Aktörler

| Aktör | Tanım | Ana yüzey |
|---|---|---|
| **Yük Sahibi (Bireysel)** | Tek seferlik eşya/paket gönderen kullanıcı | Web + Müşteri app |
| **Yük Sahibi (Kurumsal/KOBİ)** | Düzenli gönderi yapan mağaza, e-ticaret, üretici | Web portalı (+ ileride API) |
| **Nakliyeci (Bireysel sürücü)** | Kendi aracıyla çalışan şoför | Sürücü app |
| **Nakliye Firması** | Birim fiyat anlaşması olan, filo yöneten firma | Web paneli |
| **Filo Yöneticisi** | Firmanın araç ve şoförlerini yöneten kişi | Web paneli |
| **Operasyon Ajanı** | Sipariş izleme, uyuşmazlık, moderasyon, destek | Admin panel |
| **Admin** | Tarife, bölge, politika, kullanıcı yönetimi | Admin panel |
| **Alıcı** | Gönderiyi teslim alan kişi — **hesabı yok** | Public takip linki |
| **Ziyaretçi** | Henüz kullanıcı değil, güven panosunu inceliyor | Web (kimliksiz) |

## 3. Hizmet modelleri

### M1 — Anlık taşıma
Kullanıcı yükünü ve adresleri girer, önerilen aracı ve fiyatı görür, onaylar;
sistem dakikalar içinde nakliyeciyle eşleştirir. Şehir içi (Hatay'da il içi).

### M2 — Planlı taşıma
Aynı akış, ileri tarihli. Sistem slot rezerve eder, randevudan 45 dakika önce
dispatch başlatır.

Her iki modelde de kullanıcı, sipariş onayı yerine **pazarlık** başlatmayı seçebilir.

> **Kapsam dışı (MVP):** Şehirlerarası yük ve dönüş yükü eşleştirme, uluslararası taşıma,
> depolama, soğuk zincir. Domain modeli bunları engellemeyecek şekilde tasarlanır.

## 4. Fonksiyonel gereksinimler

### 4.1 Hesap ve kimlik
- **FR-1.1** Telefon numarası + SMS OTP ile kayıt ve giriş (birincil yöntem)
- **FR-1.2** E-posta + şifre alternatifi; Google ile giriş (web)
- **FR-1.3** Kurumsal hesap: vergi no/TCKN, unvan, fatura adresi, birden çok alt kullanıcı
- **FR-1.4** Profil: ad, telefon, e-posta, kayıtlı adres defteri, fatura bilgileri
- **FR-1.5** Hesap silme talebi ve veri indirme (KVKK)
- **FR-1.6** Gizlilik merkezi: güven panosu yayın rızası, bildirim tercihleri,
  rıza geçmişi — hepsi tek yerden yönetilebilir

### 4.2 Nakliyeci onboarding ve doğrulama
- **FR-2.1** Başvuru formu: kişisel/firma bilgileri, araç tipi, plaka, çalışma bölgesi
- **FR-2.2** Belge yükleme: ehliyet, ruhsat, SRC belgesi, K belgesi, zorunlu trafik
  sigortası, adli sicil kaydı, vergi levhası (kurumsal)
- **FR-2.3** Operasyon onay kuyruğu: her belge ayrı onay/red + red gerekçesi
- **FR-2.4** Belge son kullanma takibi; 30 gün önce uyarı, dolduğunda otomatik pasife alma
- **FR-2.5** Nakliye firması birden çok sürücü/araç kaydeder, işleri atar
- **FR-2.6** Firma birim fiyat sözleşmesi tanımlanabilir (şehir × araç tipi bazında)

### 4.3 Yük kategorisi ve araç önerisi
> Detaylı tasarım: [08 — Yük Kategorileri ve Araç Önerisi](08-yuk-kategorileri-ve-arac-onerisi.md)

- **FR-3.1** Hizmet modeli seçildiğinde **"Ne taşımak istiyorsunuz?"** paneli açılır
- **FR-3.2** 8 kategori görsel kart olarak, **küçükten büyüğe sıralı**, her kartta
  somut ölçek referansı ve tipik hacim aralığı:
  `BELGE_PAKET` · `KOLI` · `TEKIL_ESYA` · `ODA` · `EV` · `TICARI` · `INSAAT` · `OZEL`
- **FR-3.3** Kategoriye özel detaylandırma adımı (eşya seçimi / adet / ev tipi / palet sayısı)
- **FR-3.4** Eşya kataloğundan çoklu seçim; her eşyanın hacim, ağırlık ve **en uzun kenar**
  bilgisi tutulur
- **FR-3.5** Sistem tahmini hacim, ağırlık ve en uzun kenarı hesaplar
- **FR-3.6** Uygun araçlar hesaplanır; **en küçük uygun araç birincil öneri** olur
  (en küçük = en ucuz), 1-2 alternatif gerekçesiyle sunulur
- **FR-3.7** Öneri ekranında **doluluk göstergesi** — yükün aracın yüzde kaçını doldurduğu
- **FR-3.8** Bir alt aracın neden yetmediği açıkça yazılır ("180 cm'lik buzdolabı
  170 cm'lik kasaya girmiyor")
- **FR-3.9** Kullanıcı öneriyi ezip başka araç seçebilir; sığmayacaksa uyarılır
- **FR-3.10** Öneriyle birlikte ek hizmet önerisi çıkar (hamaliye, branda, ambalaj, kayış)
- **FR-3.11** Sürücü işi kabul ettikten sonra tek dokunuşluk geri bildirim verir:
  *tahmin doğru / araç fazla büyük / yük sığmadı* — öneri motorunun kalibrasyon verisi

### 4.4 Araç filosu
- **FR-4.1** Araç tipleri: `MOTOR` · `DOBLO` · `TRANSPORTER` · `TRANSIT` · `KAMYONET` ·
  `KAMYON` · `TIR`
- **FR-4.2** Her araç tipi için hacim (m³), taşıma kapasitesi (kg), kasa iç uzunluğu (cm),
  örnek yükler ve görsel tanımlanır
- **FR-4.3** Kapasite değerleri operasyon panelinden güncellenebilir, kodda sabit değildir

### 4.5 Fiyatlandırma
- **FR-5.1** Sipariş vermeden fiyat görme — hem web hem app'te, **giriş yapmadan da**
- **FR-5.2** Fiyat temeli firmalarla anlaşılan **birim fiyat kartları** (şehir × araç tipi);
  firma sözleşmesi yoksa şehir varsayılan tarifesi uygulanır
- **FR-5.3** Bileşenler: taban ücret + mesafe (km) + süre (dk) + ek hizmetler +
  bölge/zaman çarpanı − kupon − **platform komisyonu (şu an %0)**
- **FR-5.4** Ek hizmetler: hamaliye, kat, asansör yok, ek durak, bekleme, ambalaj,
  sigorta, montaj/demontaj, branda, kayış/sabitleme
- **FR-5.5** Fiyat dökümü şeffaf; hiçbir gizli kalem olmaz
- **FR-5.6** Teklif 15 dakika geçerli; imzalı `quoteId` ile siparişe dönüşür
- **FR-5.7** Tarifeler ve komisyon oranı **versiyonlu**; geçmiş sipariş fiyatları
  asla yeniden hesaplanmaz
- **FR-5.8** Komisyon oranı sıfır olsa bile fiyat dökümünde satır olarak görünür
  ("Platform komisyonu — 0 ₺ · komisyonsuz dönem")
- **FR-5.9** Hatay'da il içi mesafe kademeli tarife (Antakya ↔ İskenderun ~60 km)

### 4.6 Pazarlık
> Detaylı tasarım: [10 — Pazarlık](10-pazarlik.md)

- **FR-6.1** Sipariş özetinde "Hemen sipariş ver" birincil, "Pazarlık yap" ikincil aksiyon
- **FR-6.2** Pazarlık girişinde beklenen süre ve ortalama tasarruf oranı gösterilir
- **FR-6.3** Müşteri kendi fiyatını önerir; **taban fiyat açıkça gösterilir**
  (referans fiyatın %70'i, politikadan ayarlanabilir)
- **FR-6.4** Teklif uygun nakliyecilere **eş zamanlı** yayınlanır
- **FR-6.5** Nakliyeci kabul eder, karşı teklif verir veya geçer;
  karşı teklif tavanı referans fiyatın %130'u
- **FR-6.6** Nakliyeciye bağlam gösterilir: kendi ortalama kazancı, kaç rakibin gördüğü
- **FR-6.7** Karşı teklife opsiyonel gerekçe kodu eklenebilir, müşteriye gösterilir
- **FR-6.8** Müşteri teklifleri fiyat, puan ve varış süresine göre karşılaştırır;
  bileşik skorlu "Önerilen" rozeti ve hesaplanma açıklaması bulunur
- **FR-6.9** En fazla 4 tur; anlık taşımada 6 dk, planlıda 2 saat (randevu >24 saat ise 12 saat)
- **FR-6.10** Süre dolduğunda: önerilen fiyata dön / teklifi yükselt / iptal
- **FR-6.11** Pazarlık boyunca **serbest metin ve iletişim bilgisi paylaşımı yok** —
  yalnızca yapılandırılmış teklif ve gerekçe kodları
- **FR-6.12** Kötüye kullanım limitleri: saatte 5 pazarlık, minimum artış 10 ₺,
  tur başına nakliyeci başına 1 teklif

### 4.7 Sipariş oluşturma
- **FR-7.1** Alış ve teslim adresi: harita üzerinden seçim, adres arama, kayıtlı
  adreslerden seçim, pin ile ince ayar, kapı no / kat / daire notu
- **FR-7.2** Çok duraklı sipariş (en fazla 5 durak)
- **FR-7.3** Alıcı bilgisi: ad, telefon (takip linki SMS ile buraya gider)
- **FR-7.4** Planlı sipariş için tarih/saat aralığı seçimi
- **FR-7.5** Sipariş notu ve özel talimat alanı
- **FR-7.6** Güven panosu yayın rızası onay kutusu — **varsayılan işaretsiz**

### 4.8 Eşleştirme (dispatch)
- **FR-8.1** Sipariş onaylandığında sistem uygun nakliyecileri bulur: konum yakınlığı,
  araç tipi uyumu, çevrimiçi + müsait durumu, puan eşiği, belge geçerliliği
- **FR-8.2** Teklif dalgaları: en iyi 3 aday → 15 sn → kabul yoksa yarıçap genişler
  (2 km → 5 km → 10 km → 20 km)
- **FR-8.3** Bir sipariş aynı anda **yalnızca bir** nakliyeciye atanabilir
- **FR-8.4** 5 dakikada bulunamazsa kullanıcıya seçenek sunulur
  (bekle / araç değiştir / planlıya çevir / pazarlık başlat / iptal)
- **FR-8.5** Nakliyeci kabul sonrası iptal ederse ceza puanı + sipariş havuza döner
- **FR-8.6** Planlı siparişlerde dispatch randevudan 45 dk önce başlar

### 4.9 Taşıma yürütme ve canlı takip
- **FR-9.1** Nakliyeci konumu taşıma boyunca sunucuya akar (hareket hâlinde ≤5 sn)
- **FR-9.2** Müşteri konumu ve ETA'yı canlı görür
- **FR-9.3** Alıcı, SMS'le gelen imzalı public linkten hesapsız takip eder
- **FR-9.4** Aşama geçişleri: yola çıktım → alışa vardım → yüklüyorum → yolda →
  teslime vardım → boşaltıyorum → teslim ettim
- **FR-9.5** Her aşamada müşteriye push + SMS bildirimi
- **FR-9.6** Uygulama içi mesajlaşma ve **maskeli telefon araması**
- **FR-9.7** Teslim kanıtı (POD): fotoğraf, alıcı adı, dijital imza, zaman damgası, konum
- **FR-9.8** Bağlantı kaybında konumlar cihazda kuyruğa alınır, dönünce toplu gönderilir
- **FR-9.9** İptal politikası: atama öncesi ücretsiz, sonrası kademeli

### 4.10 Güven panosu
> Detaylı tasarım: [09 — Güven Panosu](09-guven-panosu.md)

- **FR-10.1** Ana sayfa ve `/pano`: canlı sayaçlar, tamamlanan taşıma akışı, şeffaflık
  istatistikleri — **kimlik doğrulaması gerektirmez**
- **FR-10.2** Akışta yalnızca **tamamlanmış** siparişler, en az **30 dakika gecikmeli**
- **FR-10.3** Konum **ilçe düzeyinde**; ilçe çiftinde son 24 saatte 5'ten az taşıma varsa
  il düzeyine çıkılır (k-anonimlik)
- **FR-10.4** İsimler kısaltılmış (`E** K.`); sipariş tutarı yayınlanmaz;
  göreli zaman kullanılır
- **FR-10.5** Yayın için **açık rıza** zorunlu; kullanıcı kaydını istediği an kaldırabilir
- **FR-10.6** Yorumlar yayından önce moderasyondan geçer (kişisel veri, küfür, spam)
- **FR-10.7** **Tüm puanlar gösterilir** — düşük puanlar dâhil; puan dağılımı yayınlanır;
  düşük puanlı yorumlara firma/operasyon yanıtı eklenebilir
- **FR-10.8** Şehir, kategori, araç tipi ve puan filtresi
- **FR-10.9** Komisyonsuz dönem panoda açıkça duyurulur
- **FR-10.10** Pazarlık toplu istatistiği gösterilir (ortalama tasarruf oranı, pazarlık sayısı)
- **FR-10.11** Puan yalnızca tamamlanmış siparişten gelebilir; karşılıklı puanlar
  ikisi de verilene veya 7 gün geçene kadar gizlidir (misilleme önleme)

### 4.11 Puanlama ve kalite
- **FR-11.1** Taşıma sonrası çift yönlü puanlama (1-5) + yorum + etiketler
- **FR-11.2** Nakliyeci metrikleri: ortalama puan, kabul oranı, iptal oranı,
  zamanında teslim oranı, pazarlık kabul oranı
- **FR-11.3** Eşik altına düşenler otomatik incelemeye alınır
- **FR-11.4** Uyuşmazlık/hasar bildirimi: kanıt yükleme → operasyon incelemesi → karar

### 4.12 Bildirimler
- **FR-12.1** Push (mobil), SMS (kritik olaylar), e-posta (fatura, özet)
- **FR-12.2** Kanal bazında tercih yönetimi
- **FR-12.3** Şablonlar Türkçe/İngilizce, merkezî yönetilir

### 4.13 Operasyon paneli
- **FR-13.1** Canlı harita: aktif siparişler ve nakliyeciler
- **FR-13.2** Sipariş arama/filtreleme, manuel atama, iptal
- **FR-13.3** Nakliyeci onay kuyruğu ve belge inceleme
- **FR-13.4** Birim fiyat kartı yönetimi (firma × şehir × araç tipi), komisyon oranı
- **FR-13.5** Pazarlık politikası yönetimi (taban/tavan yüzdeleri, tur, süre)
- **FR-13.6** Yük kategorisi ve eşya kataloğu yönetimi
- **FR-13.7** Güven panosu moderasyon kuyruğu
- **FR-13.8** Bölge yönetimi, surge kuralları, kupon üretimi
- **FR-13.9** Uyuşmazlık kuyruğu
- **FR-13.10** Raporlar: hacim, GMV, iptal oranı, ortalama eşleşme süresi,
  öneri doğruluk oranı, pazarlık dönüşüm oranı, şehir bazlı arz/talep
- **FR-13.11** Tüm yönetici işlemleri denetim kaydına yazılır

### 4.14 Ödeme (Faz 6 — en son)
- **FR-14.1** Kredi/banka kartı, 3D Secure zorunlu, saklı kart (tokenization)
- **FR-14.2** Kapıda nakit ve kapıda kart
- **FR-14.3** Kurumsal cari hesap: aylık toplu faturalama
- **FR-14.4** Nakliyeci cüzdanı: kazanç, komisyon kesintisi, haftalık hakediş
- **FR-14.5** Ön provizyon → teslimde çekim
- **FR-14.6** Taşıma sırasında oluşan ek hizmet farkı için ek tahsilat onayı
- **FR-14.7** e-Arşiv / e-Fatura entegrasyonu
- **FR-14.8** İade ve kısmi iade
- **FR-14.9** Komisyon oranı değişimi **en az 30 gün önceden** panoda ve e-postayla duyurulur

## 5. Fonksiyonel olmayan gereksinimler

### Performans
| Metrik | Hedef |
|---|---|
| Fiyat hesaplama (quote) API p95 | < 300 ms |
| Araç önerisi hesaplama | < 100 ms (yerel, dış çağrısız) |
| Sipariş oluşturma p95 | < 500 ms |
| Nakliyeci atama süresi (kabul dâhil) | medyan < 30 sn |
| Konum güncellemesi uçtan uca gecikme | < 2 sn |
| Güven panosu ilk yükleme (LCP) | < 2,0 sn |
| Web LCP (mobil, 4G) | < 2,5 sn |
| Eşzamanlı aktif takip oturumu | 10.000 (ilk hedef) |

### Erişilebilirlik ve kullanılabilirlik
- WCAG 2.2 AA; klavye navigasyonu, ekran okuyucu etiketleri, kontrast oranları
- Türkçe birincil, İngilizce ikincil — i18n ilk günden
- Mobile-first; sürücü arayüzü araç içinde tek elle kullanılabilir (≥56 px hedefler)
- Kategori paneli ve doluluk göstergesi **yalnızca görsel olamaz** —
  hacim/ağırlık metin olarak da verilir

### Güvenlik
- TLS 1.3; sertifika pinning (mobil)
- OAuth2 / OIDC (Keycloak), kısa ömürlü access token + refresh rotasyonu
- Rol tabanlı yetki + kaynak sahipliği kontrolü (her uçta, WS abonelikleri dâhil)
- Rate limiting: OTP, quote, pazarlık, arama uçlarında agresif
- Belgeler ve POD dosyaları private storage'da, imzalı kısa ömürlü URL
- Telefon maskeleme; pazarlık aşamasında hiçbir iletişim bilgisi paylaşılmaz
- OWASP ASVS L2 hedefi; bağımlılık taraması CI'da

### KVKK / veri koruma
- **Barındırma Türkiye'de** ([ADR-0005](adr/0005-veri-barindirma.md))
- Veri işleme envanteri, aydınlatma metni; rıza kayıtları versiyonlu saklanır
- Güven panosu yayını ayrı ve açık rızaya bağlı, geri alınabilir
- Konum verisi: detaylı iz 90 gün, sonra rota özeti dışında anonimleştirme
- Silme hakkı: yasal saklama süreleri (fatura 10 yıl) dışındaki veriler silinir
- Kişisel veri erişimleri loglanır

### Gözlemlenebilirlik
- Yapısal log (JSON) + korelasyon id
- Micrometer → Prometheus, Grafana; OpenTelemetry trace; Sentry
- İş metrikleri: eşleşme süresi, iptal oranı, arz/talep dengesi,
  **öneri doğruluk oranı**, **pazarlık dönüşüm oranı**, **pano rıza oranı**
- Alarmlar: eşleşme başarısızlığı, konum akışı kesintisi, moderasyon kuyruğu birikmesi

### Dayanıklılık
- Uptime hedefi %99.9
- Günlük yedek + point-in-time recovery
- Dış servis kesintilerinde graceful degradation
- `Idempotency-Key` ile sipariş, pazarlık kabulü ve ödeme uçlarında tekrar koruması

## 6. Başarı kriterleri (MVP çıkış)

- Ziyaretçi giriş yapmadan güven panosunu görüyor ve gerçek taşıma kayıtları okuyor
- Kullanıcı kategori panelinden yükünü tarif ediyor, doğru araç öneriliyor,
  neden o araç olduğunu anlıyor
- Kullanıcı hesapsız fiyat alabiliyor; kayıt olup sipariş oluşturabiliyor
- Kullanıcı pazarlık başlatıp birden fazla nakliyeciden teklif alabiliyor
- Sipariş 60 sn içinde bir nakliyeciye atanıyor (test filosuyla)
- Müşteri nakliyeciyi harita üzerinde canlı izliyor, ETA güncelleniyor
- Nakliyeci işi mobil uygulamadan uçtan uca yürütüp teslim kanıtı bırakıyor
- Tamamlanan taşıma, rıza verilmişse 30 dk sonra panoda görünüyor
- Operasyon ekibi paneli üzerinden siparişi izleyip müdahale edebiliyor
- Üç şehirde (İstanbul, Ankara, Hatay) tarife ve bölge tanımları çalışıyor
- Tüm akış Türkçe, mobil uyumlu ve erişilebilir
