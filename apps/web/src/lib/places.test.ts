import { describe, expect, it } from 'vitest';
import type { CityPlaces } from '@/data/places';
import { cityOf, matchDistrict, neighborhoodOf, normalize, parsePlace, searchPlaces } from './places';

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

  it('arama ille sınırlanmıyor — şehirlerarası taşıma açık', () => {
    /*
     * Eskiden teslim alanı alış iline kilitliydi ve alış ili değişince teslim
     * noktası sessizce siliniyordu. Şehirlerarası taşıma açıldı: aynı ada sahip
     * ilçeler farklı illerden birlikte dönmeli, yoksa İzmir → Ankara yazılamaz.
     */
    const hepsi = searchPlaces(DATA, 'kadik');
    expect(new Set(hepsi.map((o) => o.city))).toEqual(new Set(['İstanbul', 'Ankara']));
  });

  it('boş sorguda bütün illerin ilçeleri listeleniyor', () => {
    const bos = searchPlaces(DATA, '');
    expect(new Set(bos.map((o) => o.city)).size).toBeGreaterThan(1);
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

describe('neighborhoodOf', () => {
  /*
   * Kullanıcı mahalleyi zaten seçiyordu ama ilçeye çevrilirken atılıyordu; araç
   * sahibi "Kadıköy" görüp yolun ne kadarını çıkacağını bilemiyordu.
   */
  it('formatPlace biçiminden semti çıkarıyor', () => {
    expect(neighborhoodOf('İstanbul, Beşiktaş - Cihannüma')).toBe('Cihannüma');
  });

  it('yalnızca ilçe yazılmışsa null', () => {
    expect(neighborhoodOf('İstanbul, Beşiktaş')).toBeNull();
  });

  it('boş ya da bozuk girdide null — uydurulmuş semt ilana yazılmıyor', () => {
    expect(neighborhoodOf('')).toBeNull();
    expect(neighborhoodOf('İstanbul, Beşiktaş - ')).toBeNull();
    expect(neighborhoodOf(' - ')).toBeNull();
  });

  it('çok uzun metni sunucu sınırına kırpıyor', () => {
    // Sunucu 96 karakter kabul ediyor; reddi burada değil orada öğrenmeyelim
    const uzun = neighborhoodOf(`İstanbul, Beşiktaş - ${'a'.repeat(200)}`);
    expect(uzun).toHaveLength(96);
  });
});
