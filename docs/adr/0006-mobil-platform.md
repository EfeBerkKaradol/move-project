# ADR-0006 — React Native (Expo), iki ayrı uygulama

**Durum:** Kabul · **Tarih:** 2026-09-02

## Bağlam
İki farklı kullanıcı grubu için iki mobil uygulama gerekiyor: müşteri ve sürücü.
İhtiyaçları radikal biçimde farklı — müşteri uygulaması ara sıra açılan bir sipariş
aracı, sürücü uygulaması saatlerce arka planda çalışan bir GPS istemcisi.

## Karar
Her ikisi de **Expo (React Native)** ile, aynı monorepoda, paylaşılan
`packages/contracts` ve `packages/shared` üzerinden. Tek uygulama içinde rol ayrımı **yapılmaz**.

## Gerekçe — neden React Native
- Web ile aynı dil ve tip sistemi; `contracts` ve Zod şemaları doğrudan paylaşılır
- Tek kod tabanı ile iki platform — tek geliştirici için belirleyici
- EAS Build/Update ile OTA güncelleme; sürücü uygulamasında acil düzeltme değerli
- `expo-location` + `expo-task-manager` arka plan konum ihtiyacını karşılıyor

## Gerekçe — neden iki ayrı uygulama
- **Mağaza konumlandırması:** İki farklı hedef kitle, iki farklı mağaza sayfası, iki farklı
  ASO stratejisi. Tek uygulamada "sürücü misiniz?" sorusu kötü bir ilk deneyim.
- **İzinler:** Sürücü uygulaması `Always` konum izni istiyor. Müşteri uygulamasında bunu
  istemek mağaza incelemesinde ve kullanıcı güveninde sorun yaratır.
- **Bundle ve karmaşıklık:** İki rolün ekranları neredeyse hiç kesişmiyor.
- Referans ürünlerin ikisi de (Lalamove, Qmove) ayrı uygulama yayınlıyor.

## Sonuçlar
- İki mağaza hesabı, iki yayın döngüsü, iki inceleme süreci
- Paylaşılan kod `packages/` altında disiplinle tutulmalı; kopyala-yapıştır başlarsa avantaj kaybolur
- Expo'nun native modül kısıtı: özel bir native işlevsellik gerekirse config plugin veya
  development build gerekir

## Risk: sürücü uygulamasının arka plan davranışı
RN'in en zayıf olduğu alan uzun süreli arka plan işlemleri. Türkiye'de yaygın cihazlarda
(Xiaomi MIUI, Samsung One UI, Huawei EMUI) üretici pil optimizasyonu arka plan servislerini
agresif biçimde öldürüyor.

**Azaltma:**
- Faz 3'te gerçek cihazlarla 4 saatlik saha testi — çıkış kriteri, atlanamaz
- Kullanıcıya pil optimizasyonu istisnası ayarlatan yönlendirme ekranı
- Sunucu tarafında heartbeat kesintisi alarmı ve sürücüye push ile uyarı
- Konumlar cihazda kuyruklanır; servis öldürülüp yeniden başlasa bile veri kaybolmaz

**Geri çekilme planı:** Saha testi başarısız olursa sürücü uygulaması native'e
(Kotlin + Swift) taşınır. API sözleşmesi ortak olduğu için backend etkilenmez;
müşteri uygulaması RN'de kalır.

## Reddedilenler
- **Flutter:** Arka plan ve performans açısından güçlü, ancak web'deki TypeScript kodu,
  tipler ve şemalarla hiçbir şey paylaşamıyor. Tek geliştirici için bu kayıp ağır basıyor.
- **Baştan native:** 2 uygulama × 2 platform = 4 kod tabanı. Tek geliştiriciyle mümkün değil.
- **Tek uygulama, rol ayrımlı:** Yukarıdaki izin ve mağaza gerekçeleri.
