import { describe, expect, it } from 'vitest';
import { CITIES, MAP_BOX, NETWORK_CITIES, TURKEY_BORDERS, projectLonLat } from './geo-data';

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
    // 81 il: üçü rota şehri, kalanı ağ. Liste eksilirse harita "81 il" iddiasını
    // karşılamayı bırakır.
    expect(NETWORK_CITIES.length + CITIES.length).toBe(81);
    expect(NETWORK_CITIES.filter((c) => c.major).length).toBeGreaterThan(10);
    expect(NETWORK_CITIES.filter((c) => !c.major).length).toBeGreaterThan(30);
    const routeIds = new Set(CITIES.map((c) => c.label));
    for (const city of NETWORK_CITIES) {
      expect(routeIds.has(city.label)).toBe(false);
      expect(city.x).toBeGreaterThan(0);
      expect(city.x).toBeLessThan(MAP_BOX.w);
      expect(city.y).toBeGreaterThan(0);
      expect(city.y).toBeLessThan(MAP_BOX.h);
    }

    // Aynı il iki kez çizilmesin: üst üste binen noktalar tek bir parlak leke yapar
    const labels = NETWORK_CITIES.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

/**
 * İl sınırları dış hattan AYRI bir toleransla sadeleştiriliyor ama AYNI oturtmayı
 * kullanıyor. Oturtma kaçarsa sınırlar haritanın yanına düşer ve bunu ancak gözle
 * fark ederiz — testin işi o kaçışı yakalamak.
 */
describe('il sınırları', () => {
  const noktalar = [...TURKEY_BORDERS.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as const,
  );

  it('çizilebilir ve boş değil', () => {
    expect(TURKEY_BORDERS.startsWith('M')).toBe(true);
    expect(noktalar.length).toBeGreaterThan(1000);
  });

  it('bütün noktalar harita kutusunun içinde', () => {
    for (const [x, y] of noktalar) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(MAP_BOX.w);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(MAP_BOX.h);
    }
  });

  /**
   * İç sınırlar kıyıyı İÇERMEMELİ: kıyı ülke silüetinden çiziliyor ve ikisi üst
   * üste binerse ayrı sadeleştirilmiş iki çizgi bulanıklık üretir. Ölçülebilir
   * izi, sınırların kutunun kenarlarına dayanmaması.
   */
  it('kıyı çizgisini içermiyor', () => {
    const xs = noktalar.map(([x]) => x);
    const ys = noktalar.map(([, y]) => y);
    expect(Math.min(...xs)).toBeGreaterThan(20);
    expect(Math.max(...xs)).toBeLessThan(MAP_BOX.w - 20);
    expect(Math.min(...ys)).toBeGreaterThan(20);
    expect(Math.max(...ys)).toBeLessThan(MAP_BOX.h - 20);
  });

  /** Sınırlar ile şehir noktaları aynı uzayda mı: İstanbul ile Ankara arasında sınır olmalı. */
  it('şehir noktalarıyla aynı uzayda', () => {
    const istanbul = CITIES.find((c) => c.id === 'istanbul')!;
    const ankara = CITIES.find((c) => c.id === 'ankara')!;
    const arada = noktalar.filter(
      ([x, y]) => x > istanbul.x && x < ankara.x && y > Math.min(istanbul.y, ankara.y) - 40
        && y < Math.max(istanbul.y, ankara.y) + 40,
    );
    expect(arada.length).toBeGreaterThan(20);
  });
});
