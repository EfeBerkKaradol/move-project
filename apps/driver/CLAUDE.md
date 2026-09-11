# KARINCA sürücü uygulaması — geliştirici notları

Expo (React Native). Karar ve gerekçesi: [ADR-0006](../../docs/adr/0006-mobil-platform.md).
Kapsam ve çıkış kriterleri: [yol haritası Faz 3](../../docs/07-yol-haritasi.md).

**Expo sürümü hızlı değişiyor.** Kod yazmadan önce kullandığın API'yi sürümlü
dokümandan doğrula: https://docs.expo.dev/versions/v57.0.0/ — ezberden yazılan
Expo kodu sessizce eski API'ye dayanıyor.

## Uymak zorunda olduğun kurallar

**Renkler `@tasiyoruz/theme`'den gelir.** Sabit renk kodu yazılmaz. Web ile aynı
değerler; ayrışma `apps/web/src/app/theme.test.ts` ile kırılıyor.

**Sözleşme tipleri `@tasiyoruz/contracts`'tan gelir.** API yanıtları için elle tip
yazılmaz; kopyalanan tip sunucu değişince sessizce yanlış kalır (ADR-0006'nın
React Native tercihinin tek gerekçesi bu paylaşım).

**Dokunma hedefi en az 48px** (`touch.min`). Uygulama araç içinde, tek elle ve
hareket hâlinde kullanılıyor.

**Dosya yükleme `expo-file-system` `File` ile.** Expo'nun fetch'i RN'in eski
`{ uri, name, type }` FormData parçasını tanımıyor ("Unsupported FormDataPart
implementation"). `formData.append('file', new File(uri) as unknown as Blob, ad)`
— bkz. `src/screens/TripSheet.tsx`. `apiFetch` yalnızca string gövdede JSON
başlığı yazıyor; multipart'ta sınırı (boundary) fetch kendisi koyuyor.
