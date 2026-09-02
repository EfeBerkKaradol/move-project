# ADR-0009 — Pazarlık: sınırlı, çok taraflı, yapılandırılmış

**Durum:** Kabul · **Tarih:** 2026-09-02

## Bağlam
Türkiye'de nakliye zaten pazarlıkla yapılıyor. Sabit fiyat dayatmak, kullanıcının
alışkanlığına ters ve platformu telefonla pazarlığa göre dezavantajlı kılar.

Ama serbest pazarlık, kontrolsüz bırakılırsa dibe doğru yarışa döner: nakliyeci
maliyetinin altına iner, zarar eder, işi bırakır, arz çöker.

## Karar
Pazarlık **opsiyonel ikincil akış** olarak yapılıyor, üç yapısal sınırla:

1. **Taban ve tavan:** Müşteri teklifi referans fiyatın %70'inin altına inemez,
   nakliyeci karşı teklifi %130'unun üstüne çıkamaz. Yüzdeler şehir ve araç tipi
   bazında politikadan ayarlanır.
2. **Tur ve süre limiti:** En fazla 4 tur; anlık taşımada 6 dakika, planlıda 2 saat.
3. **Yapılandırılmış iletişim:** Yalnızca tutar ve gerekçe kodu. Serbest metin yok,
   iletişim bilgisi paylaşımı yok.

Pazarlık teklifi uygun nakliyecilere **eş zamanlı** yayınlanır — müşteri aynı anda
onlarcasıyla konuşur. Telefonla pazarlıkta bu mümkün değil; ürünün gerçek üstünlüğü bu.

## Gerekçe
- **Taban müşteriye açıkça gösteriliyor.** Gizli bir tabana çarpıp "reddedildi" mesajı
  almak kötü deneyim; sınırı baştan göstermek hem dürüst hem hızlı.
- **Taban firmalarla anlaşılan birim fiyata bağlı.** Bu, sınırın keyfî değil, gerçek
  maliyete dayalı olmasını sağlıyor.
- **Nakliyeciye bağlam veriliyor:** kendi ortalama kazancı ve kaç rakibin gördüğü.
  Bilgisiz pazarlık nakliyecinin zararına sonuçlanır ve uzun vadede platformu zayıflatır.
- **Tur limiti** hem kullanıcıyı yormamak hem aracı serbest bırakmak için.
- **Serbest metin yasağı** platform dışına çıkmayı (kaçak iş) engelliyor. Telefon
  paylaşılabilseydi taraflar ilk işten sonra platformu atlardı.
- **Opsiyonel ve ikincil:** Acelesi olan kullanıcı pazarlık istemez. Varsayılan yapmak
  anlık taşımayı anlık olmaktan çıkarır.

## Sonuçlar
- Ek bir durum makinesi dalı (`NEGOTIATING`) ve dispatch'ten ayrı bir eşleştirme yolu.
  Karmaşıklık artıyor.
- Sürücü uygulamasında **ayrı sekme** gerekiyor: 15 saniyelik dispatch kararıyla
  değerlendirme gerektiren pazarlık kararı aynı akışa konulamaz.
- Taban/tavan yüzdeleri başlangıçta tahminî; firma görüşmeleri sonuçlandıkça kalibre edilecek.
- Pazarlık kabulü dispatch ile aynı yarış koşulu korumasına ihtiyaç duyuyor
  (Redisson lock + optimistic locking).
- Kötüye kullanım koruması gerekiyor: saatlik pazarlık limiti, iptal oranı takibi,
  anormal karşı teklif örüntüsü tespiti.

## Ölçülecek
- **Pazarlık dönüşüm oranı** — başlatılan pazarlıkların kaçı anlaşmayla bitiyor
- **Ortalama tasarruf** — panoda toplu olarak yayınlanıyor, gerçek olmalı
- **Taban altı teklif oranı** — yüksekse taban yanlış konumlanmış demektir
- **Pazarlık sonrası iptal oranı** — yüksekse anlaşma kalitesi düşük

## Reddedilenler
- **Sınırsız serbest pazarlık:** Dibe doğru yarış, arz çöküşü.
- **Pazarlığı birincil akış yapmak:** Anlık taşımayı anlık olmaktan çıkarır.
- **Tek nakliyeciyle pazarlık:** Telefonla yapılanın aynısı; hiçbir üstünlük sağlamaz.
- **Serbest metin mesajlaşma:** Platform dışına çıkma riski ve moderasyon yükü.
