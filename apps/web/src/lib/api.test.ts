import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Katalog isteğinin API çökünce ne yaptığı.
 *
 * <p>Gerçek senaryo: ücretsiz katmandaki API 15 dakika istek almayınca uyuyor ve
 * uyanması 35–60 saniye sürüyor. Next'in veri önbelleği taze olduğu sürece
 * araya girmiyor, ama önbellek süresi dolduğunda (bir saat) istek gerçekten
 * çıkıyor ve zaman aşımına uğruyor. O anda elimizde dakikalar önce alınmış,
 * hâlâ geçerli bir katalog varken boş liste döndürmek fiyat sayfasının ilçe
 * seçicisini boşaltıyordu.
 */
describe('katalog isteği', () => {
  const ilceler = [
    { id: 'a', cityCode: '34', cityName: 'İstanbul', name: 'Kadıköy', slug: 'kadikoy', lat: 40.9, lng: 29.1 },
  ];

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('API çöktüğünde son başarılı katalogu döndürüyor', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ilceler })
      .mockRejectedValue(new Error('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);

    const { getDistricts } = await import('./api');

    expect(await getDistricts()).toEqual(ilceler);
    // İkinci çağrı ağda patlıyor ama ekran boşalmıyor
    expect(await getDistricts()).toEqual(ilceler);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('hiç başarılı cevap alınmadıysa null dönüyor', async () => {
    // Uydurma veri yok: elde bir şey yoksa çağıran taraf boş durumu göstersin
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));
    const { getDistricts } = await import('./api');
    expect(await getDistricts()).toBeNull();
  });

  it('canlı veri bayatlatılmıyor', async () => {
    /*
     * İlan panosu referans verisi değil. Saatler önceki bir ilan listesini taze
     * gibi göstermek, boş göstermekten daha yanıltıcı: kapanmış işlere teklif
     * verilmeye çalışılır.
     */
    const ilanlar = [{ id: 'x' }];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ilanlar })
      .mockRejectedValue(new Error('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);

    const { getPublicListings } = await import('./api');
    expect(await getPublicListings()).toEqual(ilanlar);
    expect(await getPublicListings()).toBeNull();
  });

  it('HTTP hatasında da son iyi katalog kullanılıyor', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ilceler })
      .mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal('fetch', fetchMock);

    const { getDistricts } = await import('./api');
    await getDistricts();
    expect(await getDistricts()).toEqual(ilceler);
  });
});
