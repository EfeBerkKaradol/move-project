import { describe, expect, it } from 'vitest';
import { MAP_BOX, projectLonLat } from '@/components/hero/geo-data';
import { normalize } from '@/lib/places';
import { PROVINCE_SHAPES } from './province-shapes';

/**
 * İl şekilleri üretilmiş veri: elle düzeltilmiyor, yeniden üretiliyor. Testin
 * işi biçimi değil <em>varsayımları</em> korumak — harita bu varsayımlar
 * bozulduğunda sessizce yanlış çalışır: il kutunun dışına düşer, yakınlaştırma
 * boş bir alana gider ya da bir il hiç seçilemez hâle gelir.
 */
describe('PROVINCE_SHAPES', () => {
  it('81 il var ve adlar tekil', () => {
    expect(PROVINCE_SHAPES).toHaveLength(81);
    expect(new Set(PROVINCE_SHAPES.map((p) => normalize(p.name))).size).toBe(81);
  });

  it('her ilin kapalı bir yolu var', () => {
    for (const il of PROVINCE_SHAPES) {
      expect(il.d.startsWith('M'), il.name).toBe(true);
      // Kapatılmamış yol dolgu yerine şerit çizer
      expect(il.d.endsWith('Z'), il.name).toBe(true);
      expect(il.d.length, il.name).toBeGreaterThan(40);
    }
  });

  it('hiçbir il harita kutusunun dışına taşmıyor', () => {
    // Taşan bir il yakınlaştırıldığında kadrajın dışında kalırdı
    for (const il of PROVINCE_SHAPES) {
      const [x, y, w, h] = il.box;
      expect(x, il.name).toBeGreaterThanOrEqual(0);
      expect(y, il.name).toBeGreaterThanOrEqual(0);
      expect(x + w, il.name).toBeLessThanOrEqual(MAP_BOX.w);
      expect(y + h, il.name).toBeLessThanOrEqual(MAP_BOX.h);
      expect(w, il.name).toBeGreaterThan(0);
      expect(h, il.name).toBeGreaterThan(0);
    }
  });

  it('etiket noktası ilin kendi kutusunun içinde', () => {
    // Ağırlık merkezi adacıklardan hesaplansaydı denize düşerdi
    for (const il of PROVINCE_SHAPES) {
      const [x, y, w, h] = il.box;
      expect(il.cx, il.name).toBeGreaterThanOrEqual(x);
      expect(il.cx, il.name).toBeLessThanOrEqual(x + w);
      expect(il.cy, il.name).toBeGreaterThanOrEqual(y);
      expect(il.cy, il.name).toBeLessThanOrEqual(y + h);
    }
  });

  it('hero haritasıyla aynı uzayda', () => {
    /*
     * İki harita aynı TURKEY_PROJECTION'dan üretiliyor. Ayrışsalardı iller
     * hero'nun çizdiği ülke silüetinin üstüne oturmazdı — ve bu, ancak gözle
     * bakınca fark edilirdi.
     */
    const beklenen = [
      ['İstanbul', 28.98, 41.01],
      ['Ankara', 32.85, 39.93],
      ['Van', 43.38, 38.49],
    ] as const;

    for (const [ad, lon, lat] of beklenen) {
      const il = PROVINCE_SHAPES.find((p) => normalize(p.name) === normalize(ad))!;
      const nokta = projectLonLat(lon, lat);
      const [x, y, w, h] = il.box;
      expect(nokta.x, ad).toBeGreaterThanOrEqual(x);
      expect(nokta.x, ad).toBeLessThanOrEqual(x + w);
      expect(nokta.y, ad).toBeGreaterThanOrEqual(y);
      expect(nokta.y, ad).toBeLessThanOrEqual(y + h);
    }
  });

  it('şapkalı yazım normalize edilince veritabanı yazımına eşitleniyor', () => {
    // Kaynak "Hakkâri" diyor, veritabanı "Hakkari": ham eşitlik o ili sessizce
    // boş gösterirdi
    const hakkari = PROVINCE_SHAPES.find((p) => normalize(p.name) === normalize('Hakkari'));
    expect(hakkari).toBeDefined();
  });

  it('veri boyutu kontrol altında', () => {
    // Bu dosya istemciye gidiyor; sadeleştirme bütçesi kaçarsa fark edilmeden
    // her sayfa yüklemesine biner
    const toplam = PROVINCE_SHAPES.reduce((t, p) => t + p.d.length, 0);
    expect(toplam).toBeLessThan(40_000);
  });
});
