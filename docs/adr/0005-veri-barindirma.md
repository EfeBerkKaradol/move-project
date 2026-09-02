# ADR-0005 — Veri barındırma bölgesi: Türkiye

**Durum:** Kabul · **Tarih:** 2026-09-02

## Bağlam
KVKK, kişisel verilerin yurt dışına aktarımını koşullara bağlıyor. Platform konum verisi,
kimlik belgeleri, telefon numaraları ve (Faz 5'te) ödeme verisi işleyecek. Ayrıca güven
panosu, kullanıcı yorumlarını herkese açık yayınlıyor — bu da kişisel veri işleme.
Kullanıcıların tamamı Türkiye'de (İstanbul, Ankara, Hatay).

## Karar
Tüm kişisel veri **Türkiye'de** barındırılır. Yedekler de Türkiye'de tutulur;
yurt dışına yedek kopya alınmaz.

## Gerekçe
- KVKK açısından en net konum — yurt dışı aktarım tartışması ve taahhütname
  gerekliliği ortadan kalkıyor
- Güven panosu ürünün merkezinde; "verileriniz Türkiye'de" mesajı stratejiyle uyumlu
- En düşük gecikme
- Hukuki danışmanlık maliyeti ve belirsizliği düşüyor

## Sonuçlar
- **Vercel kullanılamıyor** (Türkiye bölgesi yok). Web uygulamaları da k8s'te
  self-host edilir: Next.js standalone çıktısı + container. ISR için kalıcı disk
  veya Redis cache handler gerekiyor — Vercel'in bedava verdiği şeyi kendimiz kuruyoruz.
- Managed hizmet kataloğu daha dar. Sağlayıcıda managed Postgres/Redis yoksa
  k8s içinde operatörle çalıştırmak gerekir; bakım yükü artar.
- Maliyet muhtemelen AB bölgesinden yüksek.
- Sağlayıcı seçimi **hâlâ açık**: AWS Türkiye, Azure Türkiye veya yerli
  (Vargonen, Doruk, Türk Telekom Bulut). Managed Postgres/Redis desteği belirleyici.
  Faz 0 sonuna kadar karara bağlanmalı.

## Dış servisler
Google Maps, Sentry, FCM/APNs yurt dışında çalışıyor. Bunlara **kişisel veri gönderilmez**:
- Maps çağrılarında koordinat gider, kullanıcı kimliği gitmez (çağrılar backend'den geçiyor)
- Sentry'de PII maskelenir (telefon, e-posta, ad, tam adres)
- Push token kimlik değil; içerik bildirim gövdesinde kişisel veri taşımaz

## Not
Bulut sağlayıcıya özgü hizmetlere bağlanmıyoruz. Postgres, Redis, S3 uyumlu depolama
ve Kubernetes — hepsi taşınabilir. Sağlayıcı değişimi bu yüzden düşük maliyetli kalıyor.
