# ADR-0007 — Araç öneri motoru: kural tabanlı, açıklanabilir

**Durum:** Kabul · **Tarih:** 2026-09-02

## Bağlam
Kullanıcı hangi araca ihtiyacı olduğunu bilmiyor. "Panelvan mı kamyonet mi?" sorusu
onun sorusu değil. Ürünün ayırt edici mekaniği bu soruyu hiç sormamak: ne taşıyacağını
sor, aracı hesapla ([08](../08-yuk-kategorileri-ve-arac-onerisi.md)).

Soru şu: bu hesap nasıl yapılmalı?

## Karar
**Deterministik kural motoru.** Eşya kataloğundan hacim/ağırlık/en uzun kenar toplanır,
istifleme payı eklenir, kapasiteye sığan en küçük araç önerilir. Sonuç her zaman
gerekçesiyle birlikte gösterilir.

```
V = Σ(hacim × adet) × 1,25      // istifleme payı
W = Σ(ağırlık × adet) × 1,05
L = max(en uzun kenar)
öneri = araçlar.filtre(hacim≥V ∧ kapasite≥W ∧ kasaUzunluk≥L).enKüçük
```

## Gerekçe
- **Eğitim verisi yok.** Sıfırdan başlayan bir üründe ML için gereken etiketli veri
  yıllar sonra oluşur. Model kurmak için önce kural motoruyla veri toplamak gerekiyor.
- **Açıklanabilirlik zorunlu.** Kullanıcı "neden Doblo değil?" diye sorunca cevap
  verebilmeliyiz: *"180 cm'lik buzdolabı 170 cm'lik kasaya girmiyor."* Bir modelin
  çıktısı bu cümleyi üretemez, ve açıklamasız öneri güven vermez — kullanıcı daha
  ucuzunu seçer, iş bozulur.
- **En uzun kenar kısıtı kuralla doğal ifade ediliyor.** Hacim yeterli olsa bile fiziksel
  sığmama durumu, ML'in kolay öğrenemeyeceği ama kuralın tek satırda yakaladığı bir şey.
- **Kalibre edilebilir.** Katsayılar (istifleme payı, kategori tahminleri) tablo değeri;
  sürücü geri bildirimiyle elle ayarlanır. Model yeniden eğitmek gerekmiyor.
- **Hızlı.** Katalog bellekte; hedef < 100 ms, dış çağrı yok.

## Sonuçlar
- Katsayılar başlangıçta tahminî. İlk aylarda öneriler bir miktar yanlış olacak.
- Kalibrasyon için veri toplamak **zorunlu**: sürücü uygulamasında işi kabul ettikten
  sonra tek dokunuşluk geri bildirim — *tahmin doğru / araç fazla büyük / yük sığmadı*.
  Bu geri bildirim Faz 3'ün parçası ve atlanamaz; onsuz motor hiç iyileşmez.
- Eşya kataloğunun kapsamı öneriyi belirliyor. `OZEL` kategorisinde biriken talepler
  katalog genişletme kuyruğu olarak kullanılır.
- Ölçülecek metrik: **öneriyi ezip başka araç seçme oranı**. Bu oran yükseliyorsa
  motor güven vermiyor demektir.

## İleride
Yeterli veri biriktiğinde (tahminen 50.000+ tamamlanmış taşıma) ML bir **düzeltme
katmanı** olarak eklenebilir: kural motoru öneriyi üretir, model geçmiş verilere
bakarak katsayıyı düzeltir. Kuralın yerini almaz — açıklamayı üreten kural olarak kalır.

## Reddedilenler
- **Kullanıcıya araç seçtirmek:** Referans ürünlerin yaptığı. Kullanıcı bilmiyor,
  yanlış seçiyor, iş bozuluyor. Ayırt edici özelliğimizi de yok eder.
- **Baştan ML:** Veri yok, açıklanabilirlik yok.
- **Serbest metin + LLM ile tahmin:** Kullanıcı "eşyalarım var" yazar; belirsizlik artar,
  maliyet ve gecikme eklenir, sonuç doğrulanamaz. `OZEL` kategorisinde operasyon
  destekli akış bunun yerini tutuyor.
