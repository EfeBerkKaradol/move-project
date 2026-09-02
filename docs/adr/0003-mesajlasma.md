# ADR-0003 — Transactional Outbox; Kafka'yı ertele

**Durum:** Kabul · **Tarih:** 2026-09-02

## Bağlam
Sipariş oluşturulduğunda dispatch başlamalı, bildirim gitmeli, analitik kaydı düşmeli.
Bu yan etkiler siparişin kaydedilmesiyle **atomik** olmalı: sipariş kaydedilip dispatch
tetiklenmezse sipariş sonsuza kadar bekler; dispatch tetiklenip sipariş kaydedilmezse
hayalet iş oluşur.

## Karar
Transactional outbox kalıbı: olay, aggregate ile **aynı transaction'da** `outbox_events`
tablosuna yazılır. Ayrı bir relay tabloyu okuyup olayı yayınlar. MVP'de taşıyıcı
in-process publisher (Spring Modulith Event Publication Registry).

## Gerekçe
- **Atomiklik garantisi:** İki ayrı sisteme yazma (DB + broker) asla atomik olamaz.
  Outbox bunu tek yazmaya indirger.
- **Kafka'nın maliyeti bugün karşılanmıyor:** Broker kümesi, şema kaydı, tüketici grubu
  yönetimi, izleme — MVP hacminde (günde binlerce olay) bunların hiçbiri gerekmiyor.
- **Geçiş ucuz:** Üretici kod outbox'a yazar, bunu bilmez. Relay'i Kafka'ya yönlendirmek
  tek sınıflık değişiklik. Debezium ile CDC de bir seçenek.
- **Yeniden deneme ve DLQ** outbox tablosunda doğal: `attemptCount`, `lastError`.

## Sonuçlar
- Relay polling gecikmesi (~1 sn) var. Dispatch için kabul edilebilir; kabul edilemez
  hâle gelirse aynı transaction sonrası in-process tetikleme + outbox'ı güvence ağı
  olarak kullanma (hibrit) uygulanır.
- Outbox tablosu büyür — yayınlanmış kayıtlar 7 gün sonra temizlenir.
- Tüketiciler **idempotent** olmak zorunda; en az bir kez teslimat garantisi var,
  tam olarak bir kez yok.

## Reddedilenler
- **Doğrudan metot çağrısı:** Modül bağımlılığı yaratır, ADR-0002'yi ihlal eder.
- **Baştan Kafka:** Operasyonel yük, kazanç yok.
- **RabbitMQ:** Aynı gerekçe; ayrıca outbox yine gerekirdi.
