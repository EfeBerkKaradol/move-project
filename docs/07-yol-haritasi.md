# 07 — Yol Haritası

> Süreler **tek geliştirici, tam zamanlı** varsayımıyla. Yarı zamanlıysa ikiyle çarp.
> Her fazın çıkış kriteri karşılanmadan sonrakine geçilmez.

---

## Faz 0 — Temel (1–2 hafta)

**Amaç:** Sonraki her fazın üzerine inşa edileceği iskeleti kurmak.

- [ ] pnpm workspace monorepo + Turborepo, klasör yapısı
- [ ] `infra/docker/docker-compose.yml`: postgres16+postgis, redis7, keycloak26, minio, mailhog
- [ ] Keycloak realm `move`: client'lar (web, admin, customer-app, driver-app),
      roller (CUSTOMER, DRIVER, FLEET_MANAGER, OPS_AGENT, ADMIN)
- [ ] `services/api` Spring Boot 4 iskeleti, Modulith modül paketleri, sağlık ucu
- [ ] **Bağımlılık uyumluluk doğrulaması** — Boot 4 ile springdoc, Redisson, Testcontainers
      çalışıyor mu? Çalışmıyorsa Boot 3.4 LTS'e düşme kararı burada verilir
- [ ] Flyway V1: temel şema (user, driver, carrier, vehicle_type, cargo_category,
      cargo_item, zone, rate_card, platform_commission)
- [ ] Seed: 7 araç tipi + 8 yük kategorisi + eşya kataloğu + 3 şehir bölgeleri
      (İstanbul, Ankara, Hatay) + komisyon %0 kaydı
- [ ] `apps/web` Next.js 15 + Tailwind v4 + shadcn kurulumu, tasarım token'ları
- [ ] `packages/contracts`: OpenAPI → TS tip üretim hattı
- [ ] GitHub Actions CI: lint, test, build, contract diff kontrolü
- [ ] Sentry, yapısal log, `/actuator` uçları

**Çıkış kriteri:** `docker compose up` + `pnpm dev` ile tam yığın ayağa kalkıyor;
CI yeşil; web'den API'ye kimlikli bir çağrı uçtan uca çalışıyor.

---

## Faz 1 — Web MVP: Fiyat + Sipariş (4–6 hafta)

**Amaç:** Bir kullanıcı fiyat alıp sipariş verebilsin. Henüz sürücü eşleştirme yok.

**Backend**
- [ ] `geo` modülü: Google Places/Geocoding/Routes adaptörleri + Redis önbellek
- [ ] `catalog` modülü: araç tipleri, yük kategorileri, eşya kataloğu,
      **araç öneri motoru** (hacim/ağırlık/en uzun kenar → uygun araç + gerekçe)
- [ ] `pricing` modülü: birim fiyat kartları (firma × şehir × araç), komisyon (%0),
      ek hizmetler, surge, kupon, imzalı quote, Hatay il içi kademeli mesafe
- [ ] `identity` modülü: telefon+OTP (Keycloak custom authenticator), profil, adres defteri
- [ ] `ordering` modülü: sipariş oluşturma, durum makinesi, iptal politikası
- [ ] `fleet` modülü: nakliyeci başvurusu, firma kaydı, belge yükleme (presigned URL)
- [ ] Outbox altyapısı + Modulith olay yayını
- [ ] Testcontainers ile entegrasyon testleri

**Web**
- [ ] Pazarlama: ana sayfa, nasıl çalışır, araç filosu, nakliyeci ol, kurumsal, hukuki
- [ ] **Kategori paneli + araç önerisi + doluluk göstergesi** (giriş gerekmez)
- [ ] Fiyat hesaplayıcı — kategori panelinin devamı, ana dönüşüm akışı
- [ ] Giriş/kayıt (OTP), profil, adres defteri, gizlilik merkezi
- [ ] Sipariş oluşturma akışı + sipariş detayı + geçmiş
- [ ] Nakliyeci başvuru formu + belge yükleme
- [ ] i18n (tr/en), SEO temeli, sitemap, JSON-LD
- [ ] Playwright E2E: kategori seç → araç önerisi → fiyat → kayıt → sipariş

**Çıkış kriteri:** Kullanıcı "buzdolabı + 8 koli" tarif ediyor, sistem Transporter öneriyor
ve neden Doblo olmadığını açıklıyor; üç şehirde de doğru fiyat hesaplanıyor; kullanıcı OTP
ile kayıt olup sipariş oluşturabiliyor; sipariş `SEARCHING_DRIVER` durumunda bekliyor.
Lighthouse mobil ≥ 90.

---

## Faz 2 — Dispatch + Canlı Takip (3–4 hafta)

**Amaç:** Siparişin bir sürücüye ulaşması ve müşterinin izleyebilmesi.

- [ ] `dispatch` modülü: Redis GEO sürücü havuzu, aday skorlama, dalga mantığı,
      distributed lock + optimistic locking ile çift atama koruması
- [ ] `tracking` modülü: konum ingest, doğrulama filtreleri, Redis Pub/Sub yayını,
      ETA hesabı, PostGIS rota kaydı
- [ ] WebSocket katmanı + kanal bazlı yetkilendirme
- [ ] `notification` modülü: SMS (Netgsm) + e-posta, şablonlar
- [ ] Web canlı takip ekranı (harita + zaman çizelgesi + marker interpolasyonu)
- [ ] Alıcı public takip sayfası `/t/[token]`
- [ ] **Sürücü simülatörü** — mobil app olmadan dispatch'i test etmek için sahte sürücü
      istemcisi (bu araç sonraki tüm fazlarda değerli, ihmal etme)
- [ ] `apps/admin-web` v1: canlı harita, sipariş listesi, nakliyeci onay kuyruğu, manuel atama

**Çıkış kriteri:** Simüle edilmiş nakliyecilerle sipariş 60 sn içinde atanıyor; müşteri
haritada aracı canlı izliyor; ETA güncelleniyor; operasyon paneli müdahale edebiliyor.
Yük testi: 500 eşzamanlı takip oturumu sorunsuz.

---

## Faz 2.5 — Pazarlık ve Güven Panosu (3–4 hafta)

**Amaç:** İki ayırt edici özelliği devreye almak. Dispatch çalışır hâle gelmeden ikisi de
anlamlı test edilemez, o yüzden Faz 2'den sonra.

- [ ] `negotiation` modülü: oturum, tur yönetimi, taban/tavan politikası,
      eş zamanlı yayın, kabul (Redisson lock + optimistic locking)
- [ ] Pazarlık WS kanalları (`negotiation.offer` / `.counter` / `.closed`)
- [ ] Web: pazarlık başlatma paneli (taban göstergeli) + teklif karşılaştırma ekranı
- [ ] Sürücü simülatöründe karşı teklif davranışı
- [ ] `trustboard` modülü: projeksiyon, **gizlilik filtresi** (30 dk gecikme, ilçe
      düzeyi, k-anonimlik, isim kısaltma), moderasyon kuyruğu, Redis sayaçlar
- [ ] Rıza akışı: sipariş onay kutusu + puanlamada yorum onayı + `/panel/gizlilik`
- [ ] Web: ana sayfa pano bölümü + `/pano` + şehir sayfalarına gömme
- [ ] Public WS kanalı (`public:board`) — yalnızca filtrelenmiş veri
- [ ] Admin: pano moderasyon kuyruğu, operasyon yanıtı, pazarlık politikası yönetimi
- [ ] JSON-LD `Review` / `AggregateRating`

**Çıkış kriteri:** Müşteri pazarlık başlatıp birden fazla karşı teklif alıp birini kabul
edebiliyor; taban altı teklif reddediliyor ve sebebi gösteriliyor. Tamamlanan bir taşıma,
rıza verilmişse 30 dk sonra panoda ilçe düzeyinde görünüyor; rıza yoksa **görünmüyor**;
kullanıcı kaydını tek tıkla kaldırabiliyor. Düşük hacimli ilçe çiftinde il düzeyine
düşme (k-anonimlik) doğrulandı.

---

## Faz 3 — Sürücü Mobil Uygulaması (4–5 hafta)

**Amaç:** Gerçek sürücülerin sahada çalışabilmesi. **Ürünün en riskli parçası burası.**

- [ ] Expo projesi, Expo Router, kimlik (OTP), tema
- [ ] Onboarding: belge yükleme, onay durumu takibi
- [ ] Çevrimiçi/çevrimdışı geçişi, heartbeat
- [ ] Arka plan konum servisi (Android foreground service + iOS background location)
- [ ] MMKV offline kuyruk + toplu gönderim + idempotency
- [ ] İş teklifi ekranı: push bildirimi, geri sayım, kabul/red
- [ ] **Pazarlık sekmesi** (dispatch teklifinden ayrı): müşteri teklifi, referans fiyat,
      kendi ortalama kazancı, rakip sayısı, kabul / karşı teklif / geç
- [ ] Yük tahmini geri bildirimi (doğru / fazla büyük / sığmadı)
- [ ] Aktif iş ekranı: harita, navigasyon uygulamasına yönlendirme, aşama ilerletme
- [ ] Teslim kanıtı: fotoğraf, imza, alıcı adı
- [ ] Maskeli arama + uygulama içi mesajlaşma
- [ ] Kazanç ekranı (ödeme öncesi: sadece hesaplanan tutar)
- [ ] **Pil ve arka plan testi:** Xiaomi, Samsung, Huawei cihazlarda 4 saatlik saha testi.
      Bu test atlanamaz — Türkiye'de en yaygın hata kaynağı üretici pil optimizasyonu.
- [ ] EAS Build, iç test dağıtımı (TestFlight + Play internal)

**Çıkış kriteri:** Gerçek bir sürücü telefonunda 4 saat kesintisiz konum akışı; uygulama
arka plandayken iş teklifi bildirimi geliyor; teslim akışı uçtan uca tamamlanıyor;
uçak modunda yapılan aşama geçişleri bağlantı dönünce senkronize oluyor.

---

## Faz 4 — Müşteri Mobil Uygulaması (3–4 hafta)

**Amaç:** Müşteri deneyimini mobile taşımak. Faz 1-2'nin mobil karşılığı.

- [ ] Expo projesi, paylaşılan `contracts` ve `shared` paketleri
- [ ] Kimlik (OTP), profil, adres defteri (cihaz konumu ile hızlı seçim)
- [ ] Fiyat hesaplama + sipariş sihirbazı (mobil-native etkileşim: bottom sheet, harita pin)
- [ ] Canlı takip ekranı + push bildirimleri
- [ ] Sipariş geçmişi, tekrar sipariş, puanlama
- [ ] Deep link (takip linkinden uygulamaya)
- [ ] App Store / Play Store yayın hazırlığı: gizlilik beyanı, ekran görüntüleri,
      konum izni gerekçesi

**Çıkış kriteri:** Uçtan uca sipariş → takip → teslim → puanlama akışı iki mağazada da
yayınlanabilir kalitede.

---

## Faz 5 — Ödeme ve Faturalama (3–4 hafta)

- [ ] `payment` modülü + iyzico entegrasyonu (alt üye işyeri / pazaryeri modeli)
- [ ] **Komisyon devreye alma altyapısı** — oran versiyonlu, değişim 30 gün önceden
      panoda ve e-postayla duyurulur (komisyonsuz dönem 2027 Q1'de bitiyor)
- [ ] 3D Secure akışı, saklı kart (tokenization — PCI kapsamı dışında kal)
- [ ] Ön provizyon → teslimde çekim; ek hizmet farkı için ek tahsilat onayı
- [ ] Kapıda nakit / kapıda kart
- [ ] Nakliyeci cüzdanı, komisyon kesintisi, haftalık hakediş ödemesi
- [ ] Kurumsal cari hesap ve aylık toplu faturalama
- [ ] e-Arşiv fatura entegrasyonu, otomatik fatura üretimi
- [ ] İade ve kısmi iade akışları
- [ ] Mutabakat raporu (provider ↔ kendi kayıtlarımız)

**Çıkış kriteri:** Gerçek para hareketi test ortamında uçtan uca doğru; nakliyeci hakedişi
doğru hesaplanıyor; her sipariş için e-arşiv faturası üretiliyor; mutabakat farkı sıfır.

---

## Faz 6 — Ölçek ve Kurumsal (sürekli)

- [ ] Kurumsal API (webhook + REST) — e-ticaret entegrasyonu
- [ ] Toplu gönderi yükleme (CSV/Excel), rota optimizasyonu
- [ ] Sözleşmeli özel fiyatlandırma
- [ ] Yeni şehirler (İzmir, Bursa, Adana…) — bölge ve tarife tanımı işi
- [ ] Şehirlerarası taşıma + dönüş yükü eşleştirme
- [ ] Gelişmiş analitik ve arz/talep tahminleme
- [ ] `tracking` modülünün ayrı servise çıkarılması
- [ ] Sadakat programı, referans sistemi

---

## Zaman çizelgesi özeti

```
Faz 0    Temel                    ██                      1-2 hafta
Faz 1    Web MVP + Araç Önerisi   ████████                4-6 hafta
Faz 2    Dispatch + Takip         ██████                  3-4 hafta
Faz 2.5  Pazarlık + Güven Panosu  ██████                  3-4 hafta
Faz 3    Nakliyeci Mobil          ████████                4-5 hafta
Faz 4    Müşteri Mobil            ██████                  3-4 hafta
Faz 5    Ödeme                    ██████                  3-4 hafta
                                            ───────────────────────
                                            Toplam ≈ 21-29 hafta
                                                   (5-7 ay)
```

Komisyonsuz dönem 2027 Q1'de bitiyor. Faz 5 (ödeme) bundan **önce** tamamlanmalı —
komisyona geçmek için altyapının hazır ve 30 günlük duyurunun yapılmış olması gerekiyor.

## Riskler ve azaltma

| Risk | Etki | Azaltma |
|---|---|---|
| **Arz/talep yumurta-tavuk problemi** | Nakliyeci yoksa müşteri gelmez, müşteri yoksa nakliyeci kalmaz | Komisyonsuz dönem (→2027 Q1) arzı çekiyor. Üç şehirde de tek ilçeden başla. Firmalarla birim fiyat anlaşmaları pilot filoyu Faz 2'den önce hazır etmeli. |
| **Güven panosunda rıza oranının düşük çıkması** | Pano boş kalır, güven stratejisi çalışmaz | Rıza varsayılanı KVKK gereği işaretsiz kalmalı. Çözüm: panonun değerini sipariş anında iyi anlatmak + rıza verene küçük kupon teşviki. Rıza oranı Faz 2.5'ten itibaren ölçülür; %30'un altındaysa teşvik artırılır. |
| **Pazarlığın dibe doğru yarışa dönmesi** | Nakliyeci zarar eder, arz çöker | Taban fiyat (%70) firmalarla anlaşılan birim fiyata bağlı ve müşteriye açıkça gösteriliyor. Nakliyeciye kendi ortalama kazancı gösteriliyor. Taban/tavan şehir bazında kalibre edilebilir. |
| **Araç öneri motorunun yanlış tahmin etmesi** | Yük sığmaz, iş bozulur, güven gider | %25 istifleme payı + en uzun kenar kontrolü. Sürücünün tek dokunuşluk geri bildirimi (doğru/büyük/sığmadı) Faz 3'ten itibaren katsayıları kalibre eder. |
| **Sürücü app arka plan konum kesintisi** | Ürün çalışmaz hâle gelir | Faz 3'te gerçek cihazlarla saha testi zorunlu; üretici pil ayarı yönlendirme ekranı; sunucu tarafında konum kesintisi alarmı |
| **Google Maps maliyeti** | Birim ekonomi bozulur | Session token, önbellek, backend proxy, bütçe alarmı — hepsi Faz 1'de. Faz 2 sonrası gerçek maliyet ölçülüp hibrit Mapbox değerlendirilir |
| **Spring Boot 4 ekosistem olgunlaşmamışlığı** | Faz 0'da tıkanma | Faz 0'ın ilk işi uyumluluk doğrulaması; Boot 3.4 LTS'e düşme planı hazır |
| **Fiyat doğruluğu** | Nakliyeci zarar eder ya da müşteri kaçar | Firmalarla yapılan birim fiyat görüşmeleri temeli oluşturuyor; Faz 1'de gerçek güzergâhlarla kalibrasyon; tarife versiyonlu olduğu için hızlı düzeltilebilir |
| **Hatay'da il içi mesafe** | Antakya↔İskenderun ~60 km; şehir içi tarife zarar ettirir | `RateCard.distanceTiers` ile kademeli mesafe tarifesi. Firma görüşmelerinde Hatay ayrı ele alınmalı — **doğrulanması gereken varsayım** |
| **KVKK uyumsuzluğu** | Yasal yaptırım | Barındırma Türkiye'de. Faz 1'de aydınlatma metni + rıza kaydı; Faz 2.5'te pano gizlilik filtreleri; **panoyu yayına almadan önce hukuki inceleme zorunlu** |
| **Tek geliştirici darboğazı** | Takvim kayması | Fazlar bağımsız test edilebilir; mobil fazları paralelleştirmek için Faz 3 öncesi ikinci geliştirici değerlendirilmeli |

## Karar durumu

**Verilmiş kararlar**
- Marka adı: **TurMove** (geçici, değiştirilebilir) — alan adı müsaitliği kontrol edilmeli
- Şehirler: İstanbul · Ankara · Hatay
- Barındırma: **Türkiye** ([ADR-0005](adr/0005-veri-barindirma.md))
- Komisyon: 2027 ilk çeyreğine kadar **%0**
- Hizmet modelleri: yalnızca anlık ve planlı taşıma

**Hâlâ açık**
1. **Pilot ilçeler** — üç şehirde hangi ilçelerden başlanacak? Faz 1 tarife
   kalibrasyonu ve Faz 2 pilot filosu buna bağlı
2. **Hatay tarife yapısı** — il içi kademeli mesafe varsayımı firma görüşmelerinde
   doğrulanmalı
3. **Türkiye bulut sağlayıcısı** — AWS/Azure TR mi, yerli mi? Managed Postgres/Redis
   desteği belirleyici. Faz 0'ın sonuna kadar
4. **Tüzel yapı** — nakliyecilere ödeme için şirket ve iyzico alt üye işyeri sözleşmesi
   gerekli. Süreç uzun; Faz 5'ten çok önce başlatılmalı — **haber ver, başlatalım**
