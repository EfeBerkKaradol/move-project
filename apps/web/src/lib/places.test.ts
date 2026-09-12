import { describe, expect, it } from 'vitest';
import type { CityPlaces } from '@/data/places';
import { cityOf, closedCityMatch, matchDistrict, mergePlaces, neighborhoodOf, normalize, parsePlace, searchPlaces } from './places';

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


/**
 * Yer seçicisinin kapsamı.
 *
 * <p>Yerel veri yalnızca İstanbul ve Ankara'yı mahalle derinliğinde biliyor —
 * açılış illeri. Katalog ise 81 ilin tamamını taşıyor. Birleştirilmediğinde
 * İzmir'de yazan kullanıcı boş liste görüyor, elle yazdığı metin katalogla
 * eşleşmiyor ve rota çözülemediği için ilan yayınlanamıyordu.
 */
describe('mergePlaces', () => {
  const yerel = [{ city: 'İstanbul', districts: [['Kadıköy', ['Moda', 'Caferağa']]] as [string, string[]][] }];
  const katalog = [
    { id: '1', cityCode: '34', cityName: 'İstanbul', name: 'Kadıköy', slug: 'kadikoy', lat: 0, lng: 0 },
    { id: '2', cityCode: '34', cityName: 'İstanbul', name: 'Beşiktaş', slug: 'besiktas', lat: 0, lng: 0 },
    { id: '3', cityCode: '35', cityName: 'İzmir', name: 'Merkez', slug: 'merkez', lat: 0, lng: 0 },
  ];

  it('hizmet verilen iller ekleniyor', () => {
    const sonuc = mergePlaces(yerel, katalog);
    expect(sonuc.map((c) => c.city)).toContain('İzmir');
  });

  it('hizmet verilmeyen il listeye GİRMİYOR', () => {
    /*
     * Katalog 81 ili taşıyor ama hepsi açık değil. Seçilebilir olmak hizmet sözü
     * vermektir: taşıyıcı ağı olmayan bir ilde ilan yayınlayan kullanıcı hiç
     * teklif gelmeyen bir ekrana bakar.
     */
    const kapali = [
      ...katalog,
      { id: '9', cityCode: '42', cityName: 'Konya', name: 'Merkez', slug: 'merkez', lat: 0, lng: 0 },
    ];
    expect(mergePlaces(yerel, kapali).map((c) => c.city)).not.toContain('Konya');
  });

  it('yerel derinlik korunuyor', () => {
    // Kadıköy'ün mahalleleri katalogda yok; birleştirme onları silmemeli
    const ist = mergePlaces(yerel, katalog).find((c) => c.city === 'İstanbul')!;
    const kadikoy = ist.districts.find(([ad]) => ad === 'Kadıköy')!;
    expect(kadikoy[1]).toEqual(['Moda', 'Caferağa']);
  });

  it('aynı ilçe iki kez eklenmiyor', () => {
    const ist = mergePlaces(yerel, katalog).find((c) => c.city === 'İstanbul')!;
    expect(ist.districts.filter(([ad]) => ad === 'Kadıköy')).toHaveLength(1);
    // Katalogdan gelen yeni ilçe de var
    expect(ist.districts.map(([ad]) => ad)).toContain('Beşiktaş');
  });

  it('katalog yoksa açık illerin yerel verisi kalıyor', () => {
    expect(mergePlaces(yerel, null)).toEqual(yerel);
    expect(mergePlaces(yerel, [])).toEqual(yerel);
  });

  it('yerel veride kapalı il varsa o da elenİyor', () => {
    // Veri dosyası ileride bir ili taşısa bile açılması ayrı bir karar
    const kapaliYerel = [
      ...yerel,
      { city: 'Konya', districts: [['Selçuklu', []]] as [string, string[]][] },
    ];
    expect(mergePlaces(kapaliYerel, katalog).map((c) => c.city)).not.toContain('Konya');
  });
});

describe('il adıyla arama', () => {
  const veri = [
    { city: 'İzmir', districts: [['Merkez', []]] as [string, string[]][] },
    { city: 'İstanbul', districts: [['Kadıköy', []]] as [string, string[]][] },
  ];

  it('açık dört il birden aranabiliyor', () => {
    const dort = [
      { city: 'İstanbul', districts: [['Kadıköy', []]] as [string, string[]][] },
      { city: 'Ankara', districts: [['Çankaya', []]] as [string, string[]][] },
      { city: 'İzmir', districts: [['Konak', []]] as [string, string[]][] },
      { city: 'Bursa', districts: [['Nilüfer', []]] as [string, string[]][] },
    ];
    for (const [sorgu, beklenen] of [
      ['kadik', 'Kadıköy'], ['cankaya', 'Çankaya'], ['konak', 'Konak'], ['nilufer', 'Nilüfer'],
    ]) {
      expect(searchPlaces(dort, sorgu)[0]?.district).toBe(beklenen);
    }
  });

  it('il adı yazınca o ilin ilçeleri çıkıyor', () => {
    /*
     * Eskiden yalnızca ilçe ve mahalle adına bakılıyordu. İzmir'in katalogdaki
     * tek ilçesi "Merkez" ve kimse yer ararken önce "merkez" yazmıyor —
     * kullanıcı "izmir" yazıp boş liste görüyordu.
     */
    const sonuc = searchPlaces(veri, 'izmir');
    expect(sonuc).not.toHaveLength(0);
    expect(sonuc[0].city).toBe('İzmir');
  });

  it('ilçe adıyla eşleşen, il adıyla eşleşenin önünde', () => {
    // "Kadıköy" arayan biri önce Kadıköy'ü görmeli
    const sonuc = searchPlaces(
      [...veri, { city: 'Kadıköy İli Yok', districts: [['Başka', []]] as [string, string[]][] }],
      'kadik',
    );
    expect(sonuc[0].district).toBe('Kadıköy');
  });
});


describe('closedCityMatch', () => {
  const katalog = [
    { id: '1', cityCode: '34', cityName: 'İstanbul', name: 'Kadıköy', slug: 'kadikoy', lat: 0, lng: 0 },
    { id: '2', cityCode: '42', cityName: 'Konya', name: 'Merkez', slug: 'merkez', lat: 0, lng: 0 },
  ];

  it('kapalı ili tanıyor', () => {
    /*
     * İki boş sonuç aynı şey değil: "konya" yazana o ilde hizmet verilmediğini,
     * "moda" yazana başka bir adla denemesini söylemek gerekiyor. Tek cümle
     * kullanılsaydı İstanbul'da yer arayan biri "İstanbul'da hizmet veriyoruz"
     * cümlesini okurdu.
     */
    expect(closedCityMatch('konya', katalog)).toBe('Konya');
    expect(closedCityMatch('kon', katalog)).toBe('Konya');
  });

  it('açık il kapalı sayılmıyor', () => {
    expect(closedCityMatch('istanbul', katalog)).toBeNull();
  });

  it('ilçe ya da mahalle adı il sanılmıyor', () => {
    expect(closedCityMatch('moda', katalog)).toBeNull();
    expect(closedCityMatch('', katalog)).toBeNull();
    expect(closedCityMatch('konya', null)).toBeNull();
  });
});
