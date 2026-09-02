# 03 — Teknoloji Seçimleri

Her satırda **ne** ve **neden** var. "Popüler olduğu için" bir gerekçe değildir;
seçimler bu projenin gerçek kısıtlarına (Türkiye pazarı, tek geliştirici, gerçek zamanlı
konum, harita maliyeti) göre yapılmıştır.

---

## 1. Backend — `services/api`

| Alan | Seçim | Gerekçe |
|---|---|---|
| Dil / Runtime | **Java 21** | Virtual threads: dispatch ve konum akışı I/O ağırlıklı; binlerce eşzamanlı bağlantıyı reactive karmaşıklığı olmadan taşır. Zaten kullandığın stack. |
| Framework | **Spring Boot 4.0.x** | gym-os ile aynı sürüm hattı; olgun güvenlik, veri, gözlem ekosistemi |
| Modülerlik | **Spring Modulith** | Modüler monolit sınırlarını derleme/test zamanında zorlar (bkz. ADR-0002) |
| Build | **Gradle (Kotlin DSL)** | gym-os'ta Groovy DSL var; yenisinde Kotlin DSL — tip güvenli, IDE desteği daha iyi |
| Veritabanı | **PostgreSQL 16 + PostGIS** | Coğrafi sorgular (bölge içinde mi, en yakın N), `GEOGRAPHY` tipi, LINESTRING rota kaydı. Ayrı bir geo-DB'ye gerek yok. |
| Migration | **Flyway** | Versiyonlu SQL, gym-os'ta zaten var, geri dönülebilir |
| ORM | **Spring Data JPA + Hibernate** · sıcak yolda **jOOQ/JdbcTemplate** | CRUD'da JPA hızlı; dispatch sorgusu gibi performans kritik yerlerde elle yazılmış SQL |
| Cache / Geo / PubSub | **Redis 7** (Redisson client) | Tek altyapı üç iş yapıyor: GEO index, Pub/Sub fan-out, distributed lock. Ayrı bileşen eklemeye gerek yok. |
| Kimlik | **Keycloak 26** | OIDC standardı, rol yönetimi, token rotasyonu hazır. Telefon+OTP için custom authenticator SPI yazılır. gym-os'ta deneyimin var. |
| API dokümantasyonu | **springdoc-openapi** → OpenAPI 3.1 | Kod tek doğruluk kaynağı; TS tipleri buradan üretilir |
| Nesne depolama | **S3 uyumlu** (prod: AWS S3 / yerli alternatif · local: MinIO) | Belgeler, POD fotoğrafları, profil görselleri. İmzalı kısa ömürlü URL. |
| Realtime | **Spring WebSocket** + Redis Pub/Sub | Bkz. ADR-0004 |
| Zamanlanmış işler | **ShedLock** + Spring Scheduler | Çok pod'lu ortamda tek çalıştırma garantisi (planlı sipariş dispatch tetikleme, belge süre kontrolü) |
| Test | **JUnit 5 · Testcontainers · ArchUnit · REST Assured** | Testcontainers ile gerçek Postgres+PostGIS ve Redis; ArchUnit modül sınırlarını korur |
| Gözlem | **Actuator · Micrometer · OpenTelemetry · Sentry** | Metrik, trace, hata — üçü ayrı ayrı gerekli |
| Yardımcılar | **Lombok · MapStruct · Resilience4j** | Boilerplate azaltma, DTO eşleme, dış servis çağrılarında circuit breaker |

**Dikkat edilecek nokta:** Spring Boot 4 yeni; bazı üçüncü parti starter'lar henüz uyumlu
olmayabilir (springdoc, bazı observability köprüleri). Faz 0'ın ilk işi bağımlılık uyumluluğunu
doğrulamak olacak; sorun çıkarsa Boot 3.4 LTS'e düşmek makul bir geri adımdır.

---

## 2. Web — `apps/web` ve `apps/admin-web`

| Alan | Seçim | Gerekçe |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Pazarlama sayfaları için SSG/ISR + SEO, portal için client-side interaktiflik — tek çatı altında |
| Dil | **TypeScript (strict)** | `packages/contracts` ile uçtan uca tip güvenliği |
| Stil | **Tailwind CSS v4** | v4'ün CSS-first config'i ile tasarım token'ları doğrudan CSS değişkeni; tema/dark mode temiz |
| Bileşenler | **shadcn/ui (Radix primitives)** | Kod senin reponda — istediğin gibi markalarsın, node_modules'a hapsolmaz. Radix erişilebilirliği hazır getirir. |
| Animasyon | **Motion (eski Framer Motion)** | Scroll-driven hero, aşama geçişleri, harita kartı animasyonları. `motionsites.ai` bileşenleri de bu tabana oturur. |
| Server state | **TanStack Query v5** | Cache, retry, optimistic update, WS ile birlikte invalidation |
| Client state | **Zustand** | Sipariş oluşturma sihirbazının çok adımlı durumu için; Redux fazla ağır |
| Form | **React Hook Form + Zod** | Zod şemaları `packages/contracts`'tan gelir → backend validasyonuyla aynı kaynak |
| Harita | **`@vis.gl/react-google-maps`** | Google'ın resmî React sarmalayıcısı; Advanced Markers, deklaratif API |
| i18n | **next-intl** | App Router ile uyumlu, route bazlı locale (`/tr`, `/en`), tip güvenli mesaj anahtarları |
| Tablo (admin) | **TanStack Table** | Headless — shadcn ile stillenir, sunucu taraflı sayfalama/filtreleme |
| Grafik (admin) | **Recharts** veya **visx** | Operasyon raporları |
| Test | **Vitest · Testing Library · Playwright** | Birim + entegrasyon + E2E (kritik akış: fiyat al → sipariş ver → takip et) |
| Analitik | **PostHog (self-host opsiyonlu)** | Funnel analizi (kaç kişi fiyat alıp sipariş vermiyor) + KVKK açısından self-host seçeneği |

### motionsites.ai entegrasyonu
Landing sayfası hero, hizmet kartları, "nasıl çalışır" adım animasyonları ve sosyal kanıt
bölümlerinde motionsites bileşenleri kullanılacak.
> ⚠️ MCP sunucusu şu an **yetkilendirilmemiş** durumda. Kullanabilmek için claude.ai connector
> ayarlarından (veya etkileşimli bir oturumda `/mcp` ile) yetkilendirmen gerekiyor.

---

## 3. Mobil — `apps/mobile-customer` ve `apps/mobile-driver`

İki ayrı uygulama, tek monorepo, paylaşılan `packages/contracts` ve `packages/shared`.

| Alan | Seçim | Gerekçe |
|---|---|---|
| Platform | **Expo SDK 54 (React Native)** | EAS Build ile Mac'siz Android/iOS derlemesi, OTA güncelleme, olgun config plugin ekosistemi |
| Yönlendirme | **Expo Router** | Dosya tabanlı — web'deki Next.js zihinsel modeliyle aynı |
| Harita | **`react-native-maps`** (Google provider) | Her iki platformda Google haritası; polyline, custom marker, camera kontrolü |
| Konum | **`expo-location` + `expo-task-manager`** | Arka planda konum. Sürücü app'te Android foreground service, iOS `UIBackgroundModes: location` |
| Yerel depolama | **`react-native-mmkv`** | AsyncStorage'dan ~30x hızlı; offline konum kuyruğu ve token saklama için kritik |
| Server state | **TanStack Query + persist** | Web ile aynı kalıp; offline cache |
| Animasyon | **Reanimated 3 + Gesture Handler** | Bottom sheet, harita üzerinde sürüklenebilir panel, aşama geçiş animasyonları |
| Bildirim | **`expo-notifications`** (FCM + APNs) | Sipariş durumu, yeni iş teklifi (sürücü) |
| Realtime | **Native WebSocket** + `expo-network` dinleyicisi | Bağlantı kopmasında exponential backoff ile yeniden bağlanma |
| Hata takibi | **`@sentry/react-native`** | Kaynak haritalı crash raporu |
| Build / dağıtım | **EAS Build + EAS Update** | OTA ile JS güncellemesi; sürücü app'te hızlı düzeltme kritik |

### Sürücü uygulamasının özel gereksinimleri
Sürücü uygulaması "arka planda saatlerce çalışan bir GPS istemcisi" — normal bir app değil:
- **Pil:** Hareket hâlinde 5 sn, durakta 30 sn, iş yokken sadece heartbeat. Adaptif örnekleme.
- **Offline:** Konumlar MMKV kuyruğuna yazılır, bağlantı gelince toplu gönderilir. Aşama
  geçişleri de kuyruklanır ve idempotency-key ile tekrar korumalı gönderilir.
- **Android:** Foreground service + kalıcı bildirim; üretici bazlı pil optimizasyonu
  (Xiaomi, Huawei, Samsung) için kullanıcıya izin yönlendirme ekranı gerekiyor — bu Türkiye'de
  gerçek bir sorun, ihmal edilirse konum akışı sessizce kesilir.
- **iOS:** `Always` konum izni gerekçesi App Store incelemesinde net açıklanmalı.
- **UI:** Araç içinde tek elle kullanım — minimum 56px dokunma hedefi, kaydırmalı onay
  (yanlışlıkla dokunmayı önler), yüksek kontrast, sesli bildirim.

> Ölçek ve pil davranışı beklentiyi karşılamazsa sürücü uygulamasını native'e (Kotlin/Swift)
> taşımak açık bir seçenek olarak duruyor. `packages/contracts` API sözleşmesi ortak olduğu
> için bu geçiş backend'i etkilemez.

---

## 4. Harita ve konum servisleri — Google Maps Platform

| API | Kullanım | Maliyet notu |
|---|---|---|
| **Places Autocomplete (New)** | Adres arama | Session token kullan — aksi hâlde her tuş vuruşu ayrı faturalanır |
| **Geocoding** | Pin → adres, adres → koordinat | Sonuçları önbellekle (Redis, 30 gün) |
| **Routes API** | Mesafe, süre, trafikli ETA, polyline | Fiyatlamanın doğruluğu buna bağlı |
| **Routes: Compute Route Matrix** | Dispatch aday ETA'sı | Sadece ilk 10 aday için çağır |
| **Maps JavaScript / SDK** | Harita render | Yükleme sayısı üzerinden ücretlendirilir |

**Maliyet kontrol stratejisi — baştan uygulanacak, sonradan eklenmesi zor:**
1. Autocomplete'te **session token** zorunlu
2. Geocoding sonuçları Redis'te önbelleklenir (aynı adres tekrar sorgulanmaz)
3. Sık kullanılan rotalar (bölge çifti bazında) önbelleklenir
4. ETA güncellemesi lokal interpolasyonla yapılır, her seferinde Routes çağrılmaz
5. Tüm harita çağrıları **backend üzerinden** geçer — API anahtarı istemciye gömülmez,
   kota ve rate limit merkezî kontrol edilir, kötüye kullanım engellenir
6. Google Cloud'da bütçe alarmı ve API anahtarı kısıtlaması (referrer + IP) tanımlanır

> Aylık maliyet MVP'de düşük, hacim arttığında ciddileşir. Faz 2'den sonra harita **render**
> katmanını Mapbox'a taşıyıp geocoding/routing'i Google'da bırakmak (hibrit) ölçülmüş bir
> karar olarak yeniden değerlendirilecek.

---

## 5. Türkiye'ye özgü entegrasyonlar

| İhtiyaç | Sağlayıcı adayları | Faz |
|---|---|---|
| SMS / OTP | Netgsm, İleti Merkezi, Vatan SMS | Faz 1 |
| Ödeme | **iyzico** (pazaryeri/alt üye işyeri desteği var — sürücüye ödeme için şart), PayTR, Param | Faz 6 |
| e-Arşiv / e-Fatura | Logo e-Fatura, Parasut API, Uyumsoft | Faz 6 |
| Kimlik doğrulama (KYC) | NVİ TC Kimlik Doğrulama servisi, ileride e-Devlet | Faz 3 |
| Adres standardı | UAVT (Ulusal Adres Veri Tabanı) kodları — fatura ve resmî belgeler için | Faz 6 |

**Ödeme sağlayıcısı seçiminde kritik kriter:** Basit tahsilat değil, **pazaryeri modeli**
gerekiyor — parayı topla, komisyonu ayır, kalanı sürücünün hesabına aktar. iyzico'nun
alt üye işyeri (submerchant) yapısı bunu doğrudan destekliyor. Faz 6'ya bırakılsa da
mimari şimdiden `payment` modülüne bu soyutlamayla yer açıyor.

---

## 6. Altyapı ve DevOps

| Alan | Seçim | Not |
|---|---|---|
| Local geliştirme | **Docker Compose** | postgres+postgis, redis, keycloak, minio, mailhog |
| Container registry | GitHub Container Registry | |
| Orkestrasyon | **Kubernetes** (prod) | gym-os'ta `infra/k8s` kalıbın var |
| IaC | **Terraform** | Bulut kaynakları, DNS, bucket, secret |
| CI/CD | **GitHub Actions** | Lint → test → build → image → deploy |
| Web hosting | k8s'te self-host (TR) | Barındırma Türkiye'de — Vercel TR bölgesi sunmuyor (ADR-0005) |
| Secret yönetimi | Sealed Secrets / cloud secret manager | Repoda asla düz metin secret olmaz |
| Log | Loki + Grafana | Yapısal JSON log |
| Metrik | Prometheus + Grafana | |
| Uptime | Better Stack / UptimeRobot | Dışarıdan sağlık kontrolü |

### Barındırma: Türkiye
Karar verildi — tüm kişisel veri Türkiye'de barındırılıyor ([ADR-0005](adr/0005-veri-barindirma.md)).
Pratik sonuçları:
- **Vercel kullanılamıyor** (TR bölgesi yok). Web uygulamaları da k8s'te self-host edilir —
  Next.js standalone çıktısı + container. ISR için kalıcı disk veya Redis cache handler gerekir.
- Sağlayıcı adayları: AWS Türkiye, Azure Türkiye, veya yerli (Vargonen, Doruk, Türk Telekom Bulut).
  Managed Postgres/Redis desteği sağlayıcı seçiminde belirleyici — yoksa k8s içinde
  operatörle çalıştırmak gerekir ve bakım yükü artar.
- Yedekler de Türkiye'de tutulur; yurt dışı yedek kopyası alınmaz.
- Dış servisler (Google Maps, Sentry, FCM) yurt dışında — bunlara **kişisel veri gönderilmez**:
  Maps çağrılarında koordinat gider, kullanıcı kimliği gitmez; Sentry'de PII maskelenir.

### CI hattı (her PR)
```
1. Değişen paketleri tespit et (turbo/pnpm filter)
2. Lint + tip kontrolü (TS) · Spotless + Checkstyle (Java)
3. Birim testler
4. Testcontainers entegrasyon testleri (Postgres + Redis)
5. ArchUnit / Modulith sınır testleri
6. OpenAPI üret → contracts tiplerini yeniden üret → diff varsa CI kırılır
7. Bağımlılık güvenlik taraması (Dependabot + Trivy)
8. E2E (Playwright) — sadece main'e merge öncesi
```

---

## 7. Reddedilen alternatifler (kayda geçsin diye)

| Alternatif | Neden seçilmedi |
|---|---|
| Mikroservis mimarisi (baştan) | Tek geliştirici, oturmamış domain sınırları. Modüler monolit aynı sınırları operasyonel maliyet olmadan verir. |
| NestJS backend | Tek dil avantajı gerçek, ama gerçek zamanlı + coğrafi + finansal domain'de Java'nın olgunluğu ve senin mevcut deneyimin ağır bastı. |
| Flutter | Tek kod tabanı avantajı var ama web'deki TypeScript kodu, tipler ve Zod şemalarıyla hiçbir şey paylaşamıyor. |
| MongoDB | Sipariş, ödeme, hakediş ilişkisel ve transactional. PostGIS ayrıca coğrafi ihtiyacı da karşılıyor. |
| Kafka (baştan) | MVP hacminde gereksiz operasyonel yük. Outbox kalıbı geçişi sonradan ucuz kılıyor. |
| Firebase / Supabase realtime | Konum fan-out'u çözer ama dispatch mantığı ve fiyatlama zaten backend'de; ikinci bir veri düzlemi tutarlılık sorunu yaratır. |
| Kendi harita yığını (OSM + OSRM) | Çağrı maliyeti sıfır ama Türkiye'de adres/POI doğruluğu ve trafikli ETA eksiği fiyat doğruluğunu bozar. |
| Araç önerisinde makine öğrenmesi | Eğitim verisi yok ve kullanıcıya "neden bu araç" diye açıklayamayan bir sistem güven vermez. Kural tabanlı motor hem açıklanabilir hem kalibre edilebilir (ADR-0007). |
| Vercel (web hosting) | Türkiye bölgesi sunmuyor; barındırma kararıyla çelişiyor. |
