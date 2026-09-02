# Anahtarlar ve Erişimler — Not Defteri

Projenin ilerlemesi için **senin sağlaman gereken** anahtarlar, hesaplar ve erişimler.
Bir maddeyi hallettiğinde söyle, kutusunu işaretleyeyim.

> ⚠️ **Bu dosyaya asla gerçek anahtar yazılmaz.** Burada yalnızca *neyin gerektiği*
> ve *nereye konacağı* yazar. Gerçek değerler `.env` dosyalarına gider ve bunlar
> `.gitignore`'da — repoya hiçbir zaman girmez.

## Durum özeti

| | Faz 1 | Faz 3–4 | Faz 5 | Toplam |
|---|---|---|---|---|
| Bekleyen | 3 | 3 | 3 | 9 |
| Tamamlanan | 0 | 0 | 0 | 0 |

---

## Faz 1 — Web MVP (şu an burasıyla uğraşıyoruz)

### [ ] 1. Google Maps Platform API anahtarı
**Ne için:** Adres arama (Places Autocomplete), koordinat↔adres çevirisi (Geocoding),
mesafe ve trafikli varış süresi (Routes). **Fiyat doğruluğu doğrudan buna bağlı.**

**Nereye:** `services/api/.env` → `GOOGLE_MAPS_API_KEY=...`
İstemciye **gömülmüyor** — tüm harita çağrıları backend üzerinden geçiyor (docs/03).

**Nasıl alınır:**
1. console.cloud.google.com → yeni proje
2. Şu API'leri etkinleştir: *Places API (New)*, *Geocoding API*, *Routes API*, *Maps JavaScript API*
3. Kimlik Bilgileri → API anahtarı oluştur
4. **Kısıtlama ekle:** IP kısıtlaması (sunucu IP'si) + yalnızca yukarıdaki 4 API
5. Faturalandırma → **bütçe alarmı kur** (aylık limit + %50/%90 uyarısı)

**Bloke ettiği iş:** Gerçek mesafe/süre hesabı ve adres arama. O gelene kadar
takribî mesafe sağlayıcısıyla (kuş uçuşu × şehir katsayısı) devam ediyorum;
geçiş tek sınıflık bir değişiklik olacak.

---

### [ ] 2. SMS sağlayıcısı (OTP girişi için)
**Ne için:** Telefon + SMS OTP birincil giriş yöntemi. Ayrıca sipariş durumu bildirimleri
ve alıcıya gönderilen takip linki.

**Nereye:** `services/api/.env`
```
SMS_PROVIDER=netgsm
SMS_USERNAME=...
SMS_PASSWORD=...
SMS_SENDER_HEADER=...     # onaylı başlık, örn. TURMOVE
```

**Sağlayıcı adayları:** Netgsm · İleti Merkezi · Vatan SMS
**Not:** Gönderici başlığı ("TURMOVE") BTK onayı gerektiriyor ve **birkaç iş günü sürüyor** —
erken başlat. Onay gelene kadar local geliştirmede SMS konsola yazılıyor.

---

### [ ] 3. Sentry projesi (hata takibi)
**Ne için:** Backend, web ve ileride mobil için hata izleme.

**Nereye:**
```
services/api/.env  → SENTRY_DSN=...
apps/web/.env.local → NEXT_PUBLIC_SENTRY_DSN=...
```

**Not:** KVKK gereği PII maskeleniyor (telefon, e-posta, ad, tam adres). Sentry
yurt dışında olduğu için oraya kişisel veri gönderilmiyor (ADR-0005).
Ücretsiz plan başlangıç için yeterli.

---

## Faz 0–1 arası — Altyapı kararları (kod bloke değil, ama planlama gerekiyor)

### [ ] 4. Türkiye bulut sağlayıcısı hesabı
**Ne için:** Barındırma Türkiye'de olacak (ADR-0005). Vercel kullanılamıyor.

**Adaylar:** AWS Türkiye · Azure Türkiye · Vargonen · Doruk · Türk Telekom Bulut
**Seçim kriteri:** Managed PostgreSQL ve Redis desteği belirleyici — yoksa Kubernetes
içinde operatörle çalıştırmak gerekir ve bakım yükü ciddi artar.

**Karar zamanı:** Faz 1 bitmeden, gerçek kullanıcı verisi girmeden.

---

### [ ] 5. Alan adı
**Ne için:** `turmove.com` ve/veya `turmove.com.tr` — müsaitliği kontrol edilmedi.

**Not:** Marka adı geçici. Faz 1'de pazarlama sayfaları yazılmadan kesinleşmeli;
sonradan değiştirmek SEO ve mağaza kayıtlarını etkiler.

---

## Faz 3–4 — Mobil uygulamalar

### [ ] 6. Firebase projesi (Android push bildirimi)
**Ne için:** FCM üzerinden sipariş durumu ve iş teklifi bildirimleri.
**Nereye:** `apps/mobile-*/google-services.json` (gitignore'da) + `services/api/.env` → `FCM_SERVICE_ACCOUNT_JSON`

### [ ] 7. Apple Developer hesabı (iOS)
**Ne için:** APNs push anahtarı, TestFlight dağıtımı, App Store yayını.
**Maliyet:** Yıllık 99 USD. **Hesap açılışı birkaç gün sürebilir**, Faz 3'ten önce başlat.
**Nereye:** APNs `.p8` anahtarı → `services/api/.env` → `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`

### [ ] 8. Google Play Developer hesabı
**Ne için:** Android yayını. **Maliyet:** Tek seferlik 25 USD.
**Not:** Yeni geliştirici hesapları için kapalı test şartı var — Faz 3'te süreci erken başlat.

---

## Faz 5 — Ödeme

### [ ] 9. iyzico üye işyeri hesabı
**Ne için:** Tahsilat **ve nakliyeciye ödeme aktarımı**. Basit tahsilat yetmiyor —
pazaryeri (alt üye işyeri / submerchant) modeli gerekiyor.

**Nereye:** `services/api/.env` → `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`

**Ön koşul:** ⚠️ **Şirket kuruluşu.** Sözleşme tüzel kişilikle yapılıyor.
Süreç uzun — Faz 5'ten çok önce başlatılmalı. Söyle, planlayalım.

### [ ] 10. e-Arşiv / e-Fatura entegratörü
**Ne için:** Her sipariş için otomatik fatura üretimi.
**Adaylar:** Logo e-Fatura · Paraşüt API · Uyumsoft
**Ön koşul:** Şirket kuruluşu + mali mühür.

### [ ] 11. NVİ TC Kimlik Doğrulama servisi
**Ne için:** Nakliyeci onboarding'inde kimlik doğrulama (Faz 3).
**Not:** Kamu servisi, başvuru gerektiriyor.

---

## GitHub / CI

### [ ] 12. GitHub Actions secret'ları
CI şu an dış servise ihtiyaç duymuyor (Testcontainers kendi konteynerini kaldırıyor).
Deploy adımı eklendiğinde gerekecek: registry kimliği, kubeconfig, ortam anahtarları.

---

## Nereye ne konur

```
services/api/.env        Backend anahtarları (Maps, SMS, Sentry, ödeme)
apps/web/.env.local      Web'in genel değişkenleri (API URL, public Sentry DSN)
```

Her ikisi de `.gitignore`'da. Şablonları `.env.example` dosyalarında —
onlar repoda, ama **içleri boş**.

Local geliştirmede dış servislerin hiçbiri gerekmiyor: SMS konsola yazıyor,
ödeme her zaman başarılı dönüyor, mesafe takribî hesaplanıyor.
