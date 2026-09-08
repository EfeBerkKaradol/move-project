import { describe, expect, it } from 'vitest';
import { CITIES, MAP_BOX, NETWORK_CITIES, projectLonLat } from './geo-data';

/**
 * Sabit şehirler derleme anında (build-maps.mjs), ilan haritasındaki noktalar
 * çalışma anında (projectLonLat) projekte ediliyor. İkisi aynı uzayda olmazsa
 * ilan rotaları haritanın dışına düşer — bu testin koruduğu şey o.
 */
describe('projectLonLat', () => {
  const KNOWN: [string, number, number][] = [
    ['istanbul', 28.98, 41.01],
    ['ankara', 32.85, 39.93],
    ['izmir', 27.14, 38.42],
  ];

  it.each(KNOWN)('%s için derleme anındaki koordinatı üretir', (id, lon, lat) => {
    const expected = CITIES.find((c) => c.id === id)!;
    const actual = projectLonLat(lon, lat);
    expect(actual).toEqual({ x: expected.x, y: expected.y });
  });

  it('ülke sınırları içindeki her nokta harita kutusuna düşer', () => {
    // Türkiye kabaca 26–45 doğu, 36–42 kuzey
    for (let lon = 26; lon <= 45; lon += 1) {
      for (let lat = 36; lat <= 42; lat += 1) {
        const { x, y } = projectLonLat(lon, lat);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(MAP_BOX.w);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(MAP_BOX.h);
      }
    }
  });

  it('doğuya gidince x, kuzeye gidince y artmaz (yön tutarlı)', () => {
    const bati = projectLonLat(27, 39);
    const dogu = projectLonLat(41, 39);
    const guney = projectLonLat(33, 37);
    const kuzey = projectLonLat(33, 41);
    expect(dogu.x).toBeGreaterThan(bati.x);
    expect(kuzey.y).toBeLessThan(guney.y);
  });
});

describe('ağ şehirleri', () => {
  it('hepsi harita kutusunun içinde ve rota şehirleriyle çakışmıyor', () => {
    expect(NETWORK_CITIES.length).toBeGreaterThan(10);
    const routeIds = new Set(CITIES.map((c) => c.label));
    for (const city of NETWORK_CITIES) {
      expect(routeIds.has(city.label)).toBe(false);
      expect(city.x).toBeGreaterThan(0);
      expect(city.x).toBeLessThan(MAP_BOX.w);
      expect(city.y).toBeGreaterThan(0);
      expect(city.y).toBeLessThan(MAP_BOX.h);
    }
  });
});
