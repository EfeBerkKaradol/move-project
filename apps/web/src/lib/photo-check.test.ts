import { describe, expect, it } from 'vitest';
import {
  HASH_GENISLIK,
  HASH_YUKSEKLIK,
  algiHash,
  beyanUyarisi,
  hammingMesafe,
  kareSorunu,
  keskinlik,
  ortalamaParlaklik,
  tekrarEdenKare,
} from './photo-check';

/**
 * Fotoğraf kontrolünün işi, kötü kareyi <em>yakalamak</em> kadar iyi kareyi
 * rahat bırakmak. Yanlış bir "bulanık" uyarısı, düzgün fotoğraf çeken
 * kullanıcıyı boşuna uğraştırır ve uyarıların tamamını değersizleştirir.
 */

/** Düz gri bir kare — duvar fotoğrafı. */
const duz = (deger: number, n = 16) => new Array(n * n).fill(deger);

/** Satranç tahtası — bol kenarlı, "detaylı" karenin uç örneği. */
function satranc(n = 16, a = 0, b = 255) {
  const p: number[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) p.push((x + y) % 2 === 0 ? a : b);
  return p;
}

/** Yumuşak geçişli kare — odaklanmamış fotoğrafın karşılığı. */
function gradyan(n = 16) {
  const p: number[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) p.push(Math.round((x / (n - 1)) * 255));
  return p;
}

describe('ortalamaParlaklik', () => {
  it('düz karenin parlaklığı o değerin kendisi', () => {
    expect(ortalamaParlaklik(duz(120))).toBe(120);
  });

  it('boş dizide çökmüyor', () => {
    expect(ortalamaParlaklik([])).toBe(0);
  });
});

describe('keskinlik', () => {
  it('düz yüzeyde sıfır', () => {
    // Duvar ya da kapalı objektif: hiç kenar yok
    expect(keskinlik(duz(120), 16, 16)).toBe(0);
  });

  it('detaylı karede yüksek', () => {
    expect(keskinlik(satranc(), 16, 16)).toBeGreaterThan(1000);
  });

  it('yumuşak gradyan düşük ama sıfır değil', () => {
    const g = keskinlik(gradyan(), 16, 16);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThan(1000);
  });

  it('çekirdeğin sığmadığı küçük karede sıfır', () => {
    expect(keskinlik([1, 2, 3, 4], 2, 2)).toBe(0);
  });
});

describe('algiHash / hammingMesafe', () => {
  const kare = (fn: (x: number, y: number) => number) => {
    const p: number[] = [];
    for (let y = 0; y < HASH_YUKSEKLIK; y++) for (let x = 0; x < HASH_GENISLIK; x++) p.push(fn(x, y));
    return p;
  };

  it('64 biti 16 haneye sığdırıyor', () => {
    expect(algiHash(kare((x) => x * 20))).toHaveLength(16);
  });

  it('aynı kare aynı parmak izini veriyor', () => {
    const a = kare((x, y) => (x * 7 + y * 13) % 256);
    expect(algiHash(a)).toBe(algiHash([...a]));
  });

  it('parlaklığı kayan aynı sahne yine aynı sayılıyor', () => {
    // dHash komşu farkına bakıyor; poz farkı parmak izini değiştirmemeli
    const a = kare((x, y) => (x * 7 + y * 13) % 200);
    const b = a.map((v) => Math.min(255, v + 30));
    expect(hammingMesafe(algiHash(a), algiHash(b))).toBe(0);
  });

  it('başka sahne uzak çıkıyor', () => {
    const a = kare((x) => x * 25);
    const b = kare((x) => 255 - x * 25);
    expect(hammingMesafe(algiHash(a), algiHash(b))).toBeGreaterThan(5);
  });

  it('uzunluk uyuşmazsa karşılaştırmıyor', () => {
    expect(hammingMesafe('abc', 'abcd')).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('tekrarı yakalıyor, farklıyı rahat bırakıyor', () => {
    const a = algiHash(kare((x, y) => (x * 7 + y * 13) % 200));
    const ayni = algiHash(kare((x, y) => ((x * 7 + y * 13) % 200) + 20));
    const baska = algiHash(kare((x) => 255 - x * 25));
    expect(tekrarEdenKare(ayni, [a])).toBe(true);
    expect(tekrarEdenKare(baska, [a])).toBe(false);
    expect(tekrarEdenKare(a, [])).toBe(false);
  });
});

describe('kareSorunu', () => {
  it('karanlık kareyi yakalıyor', () => {
    expect(kareSorunu({ parlaklik: 12, keskinlik: 500, hash: '' })).toMatch(/karanlık/);
  });

  it('boş yüzeyi yakalıyor', () => {
    expect(kareSorunu({ parlaklik: 200, keskinlik: 0, hash: '' })).toMatch(/bulanık|boş/);
  });

  it('normal kareyi rahat bırakıyor', () => {
    // Asıl risk bu: iyi fotoğrafa uyarı çıkarsa uyarıların hepsi değersizleşir
    expect(kareSorunu({ parlaklik: 130, keskinlik: 800, hash: '' })).toBeNull();
    expect(kareSorunu({ parlaklik: 40, keskinlik: 20, hash: '' })).toBeNull();
  });

  it('tek seferde tek cümle söylüyor', () => {
    const sorun = kareSorunu({ parlaklik: 5, keskinlik: 0, hash: '' });
    expect(sorun).toMatch(/karanlık/);
    expect(sorun).not.toMatch(/bulanık/);
  });
});

describe('beyanUyarisi', () => {
  it('ev dolusu eşya için tek kare yetmiyor diyor', () => {
    expect(beyanUyarisi(1, 22)).toMatch(/22 m³/);
  });

  it('orta hacimde ikinci kareyi öneriyor', () => {
    expect(beyanUyarisi(1, 5)).toMatch(/farklı açıdan/i);
  });

  it('yeterli kare varsa susuyor', () => {
    expect(beyanUyarisi(3, 22)).toBeNull();
    expect(beyanUyarisi(2, 5)).toBeNull();
  });

  it('küçük yükte hiç uyarmıyor', () => {
    // Bir koli için üç kare istemek anlamsız
    expect(beyanUyarisi(1, 0.5)).toBeNull();
  });

  it('hiç kare yokken susuyor — o eksiği zaten form söylüyor', () => {
    expect(beyanUyarisi(0, 22)).toBeNull();
  });
});
