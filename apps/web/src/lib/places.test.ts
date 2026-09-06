import { describe, expect, it } from 'vitest';
import type { CityPlaces } from '@/data/places';
import { cityOf, matchDistrict, normalize, parsePlace, sameCity, searchPlaces } from './places';

const DATA: CityPlaces[] = [
  { city: 'İstanbul', districts: [['Kadıköy', ['Caferağa', 'Moda']], ['Beşiktaş', ['Cihannüma']]] },
  { city: 'Ankara', districts: [['Çankaya', ['Kızılay']], ['Kadıköy', []]] },
];

describe('yer arama', () => {
  it('Türkçe karakter yazmadan da bulur', () => {
    // Kullanıcı klavye dilini ayarlamamış olabilir
    expect(normalize('Beşiktaş')).toBe('besiktas');
    expect(searchPlaces(DATA, 'besikt').map((o) => o.district)).toContain('Beşiktaş');
  });

  it('il kilidi verilince yalnızca o ilin yerlerini döner', () => {
    const hepsi = searchPlaces(DATA, 'kadik');
    expect(new Set(hepsi.map((o) => o.city))).toEqual(new Set(['İstanbul', 'Ankara']));

    const kilitli = searchPlaces(DATA, 'kadik', 'İstanbul');
    expect(kilitli).not.toHaveLength(0);
    expect(new Set(kilitli.map((o) => o.city))).toEqual(new Set(['İstanbul']));
  });

  it('boş sorguda da kilide uyar', () => {
    // Alana odaklanınca tüm ilçeler listeleniyor; kilit orada da geçerli olmalı
    const kilitli = searchPlaces(DATA, '', 'Ankara');
    expect(kilitli.map((o) => o.district)).toEqual(['Çankaya', 'Kadıköy']);
  });

  it('kilit ili tanınmıyorsa boş liste döner', () => {
    expect(searchPlaces(DATA, '', 'Konya')).toHaveLength(0);
  });
});

describe('alan değeri', () => {
  it('ili ayrıştırır', () => {
    expect(cityOf('İstanbul, Kadıköy')).toBe('İstanbul');
    expect(cityOf('İstanbul, Beşiktaş - Cihannüma')).toBe('İstanbul');
    expect(cityOf('serbest metin')).toBeNull();
  });

  it('mahalleyi ayırır', () => {
    expect(parsePlace('İstanbul, Beşiktaş - Cihannüma')).toEqual({
      city: 'İstanbul', district: 'Beşiktaş', neighborhood: 'Cihannüma',
    });
  });

  it('boş alanı çelişki saymaz', () => {
    // Kullanıcı henüz teslim noktasını seçmediyse uyarı çıkmamalı
    expect(sameCity('İstanbul, Kadıköy', '')).toBe(true);
    expect(sameCity('İstanbul, Kadıköy', 'İstanbul, Beşiktaş')).toBe(true);
    expect(sameCity('İstanbul, Kadıköy', 'Ankara, Çankaya')).toBe(false);
  });
});

describe('ilçe eşleme', () => {
  const districts = [
    { id: 'a', cityCode: '34', cityName: 'İstanbul', name: 'Kadıköy', slug: 'kadikoy', lat: 0, lng: 0 },
    { id: 'b', cityCode: '06', cityName: 'Ankara', name: 'Çankaya', slug: 'cankaya', lat: 0, lng: 0 },
  ];

  it('il ve ilçe birlikte eşleşir', () => {
    // Yalnızca ilçe adına bakılsaydı Ankara'nın Kadıköy'ü İstanbul'unkiyle karışırdı
    expect(matchDistrict(districts, 'İstanbul, Kadıköy')?.id).toBe('a');
    expect(matchDistrict(districts, 'Ankara, Kadıköy')).toBeNull();
  });

  it('mahalle seçimi ilçeye düşer', () => {
    expect(matchDistrict(districts, 'İstanbul, Kadıköy - Moda')?.id).toBe('a');
  });

  it('listede olmayan serbest metin eşleşmez', () => {
    expect(matchDistrict(districts, 'Hadımköy')).toBeNull();
  });
});
