# ADR-0004 — WebSocket + Redis Pub/Sub

**Durum:** Kabul · **Tarih:** 2026-09-02

## Bağlam
Sürücü konumu müşteriye ve alıcıya saniyeler içinde ulaşmalı. Sürücü tarafı **yazma
ağırlıklı** (sürekli konum gönderir), müşteri tarafı **okuma ağırlıklı**. API birden çok
pod'da çalışacak — sürücünün bağlandığı pod ile müşterinin bağlandığı pod farklı olabilir.

## Karar
Çift yönlü kanal olarak düz WebSocket (JSON zarf), pod'lar arası fan-out için Redis Pub/Sub.
Fallback zinciri: WS → SSE → 5 sn polling.

## Gerekçe
- **Çift yönlülük gerekli:** Sürücü konum gönderiyor **ve** iş teklifi alıyor. SSE tek yönlü
  olduğu için sürücü tarafında yetmez.
- **Redis zaten var** (GEO index ve lock için). Pub/Sub için ek altyapı gerekmiyor.
- **STOMP değil, düz WS:** STOMP'un abonelik semantiği güzel ama React Native tarafında
  ek kütüphane ve hata ayıklama yükü getiriyor. Kanal semantiğini kendi zarfımızla
  (`subscribe`/`unsubscribe` mesajları) 100 satırda çözüyoruz.
- **Fallback zinciri:** Kurumsal ağlar ve bazı mobil operatörler WS'i engelleyebiliyor.
  Takip ekranının hiç çalışmaması kabul edilemez.

## Sonuçlar
- Yapışkan oturum (sticky session) gerekmez — Redis Pub/Sub sayesinde herhangi bir pod
  herhangi bir aboneye ulaşır.
- Bağlantı sayısı pod başına bellek tüketir; 10.000 eşzamanlı bağlantı için pod başına
  ~1-2 GB planlanmalı.
- Redis Pub/Sub **kalıcı değildir** — bağlantı kopukken kaçırılan mesajlar kaybolur.
  Bu yüzden istemci yeniden bağlandığında `GET /orders/{id}/tracking` ile son durumu
  REST'ten tazeler. Kritik durum değişiklikleri ayrıca push bildirimi olarak da gider.
- Kanal yetkilendirmesi **her `subscribe` isteğinde** doğrulanmalı. Atlanırsa herhangi
  bir kullanıcı başkasının konumunu izleyebilir — bu sistemdeki en kritik güvenlik kontrolü.

## Reddedilenler
- **Sadece SSE:** Sürücü tarafı çift yönlülük gerektiriyor.
- **Polling:** 5 sn'de bir 10.000 istemci = saniyede 2.000 istek, gereksiz yük ve gecikme.
- **Firebase Realtime Database / Supabase Realtime:** İkinci bir veri düzlemi ve
  tutarlılık sorunu; dispatch mantığı zaten backend'de.
- **MQTT:** Mobil için ideal protokol ama ek broker ve web tarafında ek karmaşıklık.
  Sürücü sayısı on binlere çıkarsa yeniden değerlendirilir.
