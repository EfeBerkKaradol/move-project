import {
  HASH_GENISLIK,
  HASH_YUKSEKLIK,
  type KareOlcum,
  OLCUM_BOYUTU,
  algiHash,
  keskinlik,
  ortalamaParlaklik,
} from './photo-check';

/**
 * Dosyayı çözüp {@link photo-check} ölçülerini üretir.
 *
 * <p>Ayrı dosyada, çünkü burası tarayıcıya bağlı olan ince katman: karar veren
 * mantık yanında değil, {@code photo-check} içinde ve orada kurulum gerektirmeden
 * sınanıyor.
 *
 * <p>Kare hiç okunamazsa {@code null} dönüyor ve kullanıcı hiçbir uyarı görmüyor.
 * Bilmediğimiz bir şey hakkında konuşmuyoruz: çözemediğimiz bir dosyaya "bulanık"
 * demek, yanlış bilgi vermek olur. Sunucu kabul etmezse zaten orada söyleyecek.
 */
export async function kareyiOlc(file: File): Promise<KareOlcum | null> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const gri = grileStir(bitmap, OLCUM_BOYUTU, OLCUM_BOYUTU);
      const hashGri = grileStir(bitmap, HASH_GENISLIK, HASH_YUKSEKLIK);
      if (!gri || !hashGri) return null;
      return {
        parlaklik: ortalamaParlaklik(gri),
        keskinlik: keskinlik(gri, OLCUM_BOYUTU, OLCUM_BOYUTU),
        hash: algiHash(hashGri),
      };
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

/** Küçültülmüş gri tonlama. Ölçüler renkten bağımsız; üç kanalı taşımanın anlamı yok. */
function grileStir(bitmap: ImageBitmap, genislik: number, yukseklik: number): Uint8Array | null {
  const canvas = document.createElement('canvas');
  canvas.width = genislik;
  canvas.height = yukseklik;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(bitmap, 0, 0, genislik, yukseklik);
  let veri: Uint8ClampedArray;
  try {
    veri = ctx.getImageData(0, 0, genislik, yukseklik).data;
  } catch {
    // Bazı ortamlarda tuval okuması engelli; ölçüm yapamıyorsak susuyoruz
    return null;
  }

  const gri = new Uint8Array(genislik * yukseklik);
  for (let i = 0; i < gri.length; i++) {
    // Rec. 601 ağırlıkları: göz yeşili kırmızıdan, kırmızıyı maviden parlak görüyor
    gri[i] = (0.299 * veri[i * 4] + 0.587 * veri[i * 4 + 1] + 0.114 * veri[i * 4 + 2]) | 0;
  }
  return gri;
}
