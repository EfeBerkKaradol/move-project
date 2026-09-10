/**
 * Yük fotoğrafının işe yarayıp yaramadığının kontrolü.
 *
 * <p>Fotoğraf zorunluydu ama hiç okunmuyordu: kullanıcı karanlık bir kare ya da
 * aynı fotoğrafı üç kez yükleyip fiyatı görüyordu, teklif veren araç sahibi de
 * hiçbir şey göremiyordu. Buradaki kontroller kareyi <em>tanımıyor</em> — ne
 * olduğunu söylemiyor — ama bakmaya değer olup olmadığını söylüyor.
 *
 * <p><strong>Eşya tanıma yok ve uydurulmuyor.</strong> Görüntüden eşya çıkaran
 * bir servis bağlı değil; bağlanacaksa ADR-0005 geçerli, bu kareler birinin
 * evinin içi. Araç önerisi kullanıcının beyanından çıkmaya devam ediyor.
 *
 * <p>Hepsi <em>uyarı</em>, engel değil. Eşikler gerçek yüklemelerle kalibre
 * edilmedi — elde veri yok. O yüzden bilerek temkinli seçildi: yanlış bir
 * "bulanık" uyarısı, düzgün fotoğraf çeken kullanıcıyı boşuna uğraştırır.
 * Yakalamayı hedefledikleri, tartışmasız kötü kareler: bomboş duvar, kapağı
 * kapalı çekilmiş kare, aynı fotoğrafın tekrarı.
 */

/** Ölçümlerin yapıldığı küçültülmüş kare boyutu. */
export const OLCUM_BOYUTU = 128;

/** Algı parmak izinin ızgarası: 9 sütun × 8 satır → 64 bit. */
export const HASH_GENISLIK = 9;
export const HASH_YUKSEKLIK = 8;

/** 0–255 ortalama parlaklık; altı "karanlık". */
const KARANLIK_ESIGI = 35;

/**
 * Laplace varyansı; altı "bulanık ya da boş". Klasik eşik tam çözünürlükte
 * yüzlerle ölçülür, burada küçültülmüş kare kullanıldığı için çok daha düşük —
 * ve kasten daha da düşük tutuldu.
 */
const BULANIK_ESIGI = 15;

/** 64 bitin kaçı farklıysa "başka kare" sayılır. */
const TEKRAR_ESIGI = 5;

export type KareOlcum = {
  /** 0–255 ortalama parlaklık. */
  parlaklik: number;
  /** Laplace varyansı — yüksekse detaylı, sıfıra yakınsa düz bir yüzey. */
  keskinlik: number;
  /** 64 bitlik algı parmak izi, onaltılık. */
  hash: string;
};

/** Ortalama parlaklık. Boş dizide 0 — çağıran taraf zaten uyarı görecek. */
export function ortalamaParlaklik(gri: ArrayLike<number>): number {
  if (gri.length === 0) return 0;
  let toplam = 0;
  for (let i = 0; i < gri.length; i++) toplam += gri[i];
  return toplam / gri.length;
}

/**
 * Laplace varyansı — odak ölçüsünün klasik hâli.
 *
 * <p>Kenar bulucu bir çekirdek uygulanıyor; sonucun varyansı düz yüzeylerde
 * sıfıra, detaylı görüntülerde yükseğe gidiyor. Kenar pikselleri atlanıyor:
 * komşusu olmayan pikselde çekirdek tanımsız.
 */
export function keskinlik(gri: ArrayLike<number>, genislik: number, yukseklik: number): number {
  if (genislik < 3 || yukseklik < 3) return 0;
  const degerler: number[] = [];
  for (let y = 1; y < yukseklik - 1; y++) {
    for (let x = 1; x < genislik - 1; x++) {
      const i = y * genislik + x;
      degerler.push(
        4 * gri[i] - gri[i - 1] - gri[i + 1] - gri[i - genislik] - gri[i + genislik],
      );
    }
  }
  if (degerler.length === 0) return 0;
  const ortalama = degerler.reduce((a, b) => a + b, 0) / degerler.length;
  return degerler.reduce((a, b) => a + (b - ortalama) ** 2, 0) / degerler.length;
}

/**
 * dHash: her pikseli sağ komşusuyla karşılaştıran 64 bitlik parmak izi.
 *
 * <p>Mutlak parlaklık yerine komşu farkına baktığı için aynı sahnenin biraz
 * farklı pozlanmış iki karesini de aynı sayıyor — aradığımız tam olarak bu:
 * kullanıcının aynı eşyayı iki kez göndermesi.
 *
 * @param gri {@link HASH_GENISLIK}×{@link HASH_YUKSEKLIK} küçültülmüş gri kare
 */
export function algiHash(gri: ArrayLike<number>): string {
  let bitler = '';
  for (let y = 0; y < HASH_YUKSEKLIK; y++) {
    for (let x = 0; x < HASH_GENISLIK - 1; x++) {
      const i = y * HASH_GENISLIK + x;
      bitler += gri[i] > gri[i + 1] ? '1' : '0';
    }
  }
  // 64 bit → 16 onaltılık hane
  let onaltilik = '';
  for (let i = 0; i < bitler.length; i += 4) {
    onaltilik += parseInt(bitler.slice(i, i + 4).padEnd(4, '0'), 2).toString(16);
  }
  return onaltilik;
}

/** İki parmak izi arasında farklı bit sayısı. */
export function hammingMesafe(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let fark = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      fark += x & 1;
      x >>= 1;
    }
  }
  return fark;
}

/** Kare zaten yüklenmişlerden birinin tekrarı mı. */
export function tekrarEdenKare(hash: string, oncekiler: string[]): boolean {
  return oncekiler.some((o) => hammingMesafe(hash, o) <= TEKRAR_ESIGI);
}

/**
 * Karenin sorunu; yoksa null.
 *
 * <p>Tek bir cümle dönüyor: iki uyarıyı birden göstermek kullanıcıyı fotoğrafı
 * düzeltmeye değil vazgeçmeye iter.
 */
export function kareSorunu(olcum: KareOlcum): string | null {
  if (olcum.parlaklik < KARANLIK_ESIGI) {
    return 'Bu kare çok karanlık — eşya görünmüyor. Işığı açıp tekrar çekebilir misin?';
  }
  if (olcum.keskinlik < BULANIK_ESIGI) {
    return 'Bu kare bulanık ya da boş görünüyor. Eşyanın kendisini net bir şekilde çek.';
  }
  return null;
}

/**
 * Beyanla kare sayısı tutuyor mu.
 *
 * <p>"Ev dolusu eşya" deyip tek kare göndermek, araç sahibine hiçbir şey
 * anlatmıyor: teklifi yine görmediği bir yüke veriyor. Engellemiyoruz —
 * kaç karenin yettiği yükün cinsine göre değişiyor ve bunu kullanıcı bizden
 * iyi biliyor.
 */
export function beyanUyarisi(kareSayisi: number, hacimM3: number): string | null {
  if (kareSayisi === 0) return null;
  if (hacimM3 >= 10 && kareSayisi < 3) {
    return `${hacimM3.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m³ eşya beyan ettin ama ${kareSayisi} kare var. Araç sahibi bu kadarına bakarak teklif veremiyor — birkaç kare daha ekle.`;
  }
  if (hacimM3 >= 3 && kareSayisi < 2) {
    return 'Tek kare bu yükü anlatmıyor. Farklı açıdan bir kare daha ekleyebilir misin?';
  }
  return null;
}
