# ADR-0002 — Modüler monolit (Spring Modulith)

**Durum:** Kabul · **Tarih:** 2026-09-02

## Bağlam
Backend 12 iş alanı içeriyor (identity, pricing, ordering, dispatch, tracking, …).
Bu alanların bazıları çok farklı yük profillerine sahip: `tracking` saniyede binlerce
yazma alırken `pricing` çoğunlukla okuma yapıyor. Mikroservise bölme baskısı doğal olarak var.

## Karar
Tek deploy edilebilir Spring Boot uygulaması; içeride Spring Modulith ile zorlanan sert
modül sınırları. Modüller arası iletişim yalnızca açık arayüz veya domain event üzerinden.

## Gerekçe
- **Domain sınırları henüz oturmadı.** Yanlış yerden bölünmüş mikroservisler,
  monolitten çok daha pahalı bir hatadır — sınırı değiştirmek dağıtık bir refactor demek.
- **Transaction basitliği:** Sipariş oluşturma + quote snapshot + outbox yazımı tek
  veritabanı transaction'ında. Mikroserviste bu saga/kompanzasyon gerektirir.
- **Tek geliştirici:** 12 servisin CI/CD, gözlem, deploy ve debug yükü ürün geliştirmeyi durdurur.
- **Sınırlar yine de zorlanıyor:** Modulith + ArchUnit testleri CI'da sınır ihlalini
  kırar. Yani mikroservisin disiplinini, operasyonel maliyeti olmadan alıyoruz.

## Sonuçlar
- Modüller ayrı ölçeklenemez — tüm uygulama birlikte ölçeklenir. `tracking` yükü
  arttığında bu bir sorun olacak (bkz. mimari doküman, ölçekleme aşama 3).
- Tek veritabanı; şema disiplini modül bazlı tablo öneki ve şema ayrımıyla korunur.
- Bir modüldeki bellek sızıntısı tüm uygulamayı etkiler.

## Çıkarma planı
`tracking` ilk aday. Sınırı zaten temiz olduğu için çıkarma işi: modül paketini yeni
servise taşı, in-process event yayınını Kafka'ya çevir, WS uçlarını yönlendir.
Tetikleyici: 5.000 eşzamanlı takip oturumu veya konum ingest'in API p95'ini bozması.

## Reddedilenler
- **Baştan mikroservis:** Yukarıdaki gerekçeler.
- **Sınırsız monolit:** 6 ay sonra modüller birbirine dolanır, çıkarma imkânsızlaşır.
