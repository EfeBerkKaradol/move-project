# ADR-0008 — Güven panosu ve gizlilik tasarımı

**Durum:** Kabul · **Tarih:** 2026-09-02

## Bağlam
Komisyonsuz dönemin (→2027 Q1) amacı ciro değil, **tanınırlık ve güven**. Yeni bir
platforma eşya emanet etmek yüksek güven gerektiren bir karar. En güçlü ikna aracı:
gerçek insanların gerçek taşımaları ve değerlendirmeleri, herkese açık.

Ancak bu özelliğin naif hâli tehlikeli. Devam eden bir siparişin rotasını yayınlamak,
"şu anda şu semtteki şu ev boşaltılıyor" bilgisini herkese açık hâle getirir —
hırsızlık ve takip riski.

## Karar
Güven panosu yapılıyor, ancak gizlilik kısıtları özelliğin kendisi kadar bağlayıcı:

1. Yalnızca **tamamlanmış** siparişler, en az **30 dakika gecikmeli**
2. Konum **ilçe** düzeyinde; ilçe çiftinde son 24 saatte 5'ten az taşıma varsa
   **il düzeyine çıkılır** (k-anonimlik)
3. İsimler kısaltılır, tutar yayınlanmaz, **göreli zaman** kullanılır
4. Yayın **açık rızaya** bağlı — varsayılan işaretsiz, istenildiği an geri alınabilir
5. Yorumlar yayından önce moderasyondan geçer
6. `PublicFeedEntry` müşteri `userId`'sini tutmaz; `orderId` API yanıtında yer almaz
7. `public:board` WS kanalına yalnızca `trustboard` modülü yayın yapabilir

## Gerekçe
- Kural 1 ve 2 olmadan pano bir **güvenlik açığı**; bunlar pazarlık konusu değil
- Kural 4 KVKK gereği: sessiz varsayılan geçerli rıza sayılmaz
- Kural 2'deki k-anonimlik özellikle Hatay için kritik — düşük hacimli bir ilçe
  çiftinde tek taşımanın kime ait olduğu belli olur
- Kural 7 mimari bir koruma: yanlışlıkla ham sipariş verisi yayınlanmasını
  modül sınırıyla engelliyoruz, kod incelemesine güvenmiyoruz

## Dürüstlük kararı
**Tüm puanlar gösterilir**, düşük puanlar dâhil; puan dağılımı yayınlanır; düşük puanlı
yorumlara operasyon yanıtı eklenebilir ve "sadece düşük puanlar" filtresi vardır.

Sadece 5 yıldız göstermek panoyu reklam panosuna çevirir ve ters teper — insanlar sahte
yorumu tanır. Kötü bir yorumun görünür olması ve altında ciddi bir yanıt bulunması,
kusursuz bir ortalamadan daha fazla güven üretir.

## Sonuçlar
- **Rıza oranı riski:** Varsayılan işaretsiz olduğu için pano beklenenden yavaş dolabilir.
  Çözüm varsayılanı değiştirmek **değil**; panonun değerini iyi anlatmak ve rıza verene
  küçük kupon teşviki sunmak. Rıza oranı Faz 2.5'ten itibaren ölçülür.
- 30 dakikalık gecikme "canlı" hissini bir miktar azaltıyor. Bunu telafi eden şey
  toplu canlı sayaçlar — onlar anlık, çünkü kimseyi tanımlamıyorlar.
- Moderasyon operasyonel yük getiriyor. Otomatik filtre (telefon, adres, plaka, küfür)
  ilk katman; insan incelemesi yalnızca işaretlenenlerde.
- Panoyu yayına almadan önce **hukuki inceleme zorunlu**.

## Yan fayda
Sürekli büyüyen, özgün, kullanıcı üretimi içerik — programatik SEO sayfalarının
"ince içerik" riskini ortadan kaldırıyor. Şehir × kategori sayfaları kendi kendine doluyor.

## Reddedilenler
- **Canlı, devam eden siparişleri göstermek:** Güvenlik riski. Toplu sayaç yeterli.
- **Rızayı varsayılan işaretli yapmak:** KVKK'ya aykırı ve güven inşa etme amacının tersi.
- **Sadece yüksek puanları göstermek:** Sahte görünür, ters teper.
- **Tam adres veya harita üzerinde rota göstermek:** Hiçbir gecikme bunu güvenli yapmaz.
