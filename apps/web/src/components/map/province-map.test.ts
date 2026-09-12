import { describe, expect, it } from 'vitest';
import { kenarNoktasi, suzgecHref } from './ProvinceMap';

/**
 * Haritanın saf mantığı. Geri kalanı (dönüşüm, sürükleme) tarayıcıya bağlı ve
 * gözle doğrulanıyor; bu ikisi sessizce yanlış çalışabilecek türden.
 */
describe('suzgecHref', () => {
  it('süzgeç yokken düz adres üretiyor', () => {
    expect(suzgecHref('/ilanlar', '', null)).toBe('/ilanlar');
  });

  it('il seçimini taşıyor', () => {
    expect(suzgecHref('/ilanlar', '', '34')).toBe('/ilanlar?il=34');
  });

  it('araç süzgeci il değişince kaybolmuyor', () => {
    // Kaybolsaydı kullanıcı haritada il değiştirdiğinde araç seçimi sıfırlanır
    expect(suzgecHref('/ilanlar', 'PANELVAN', '34')).toBe('/ilanlar?arac=PANELVAN&il=34');
  });

  it('ilçe yalnızca ille birlikte yazılıyor', () => {
    /*
     * İlçe adı ilsiz benzersiz değil: "Merkez" yetmiş sekiz ilde, "Çayırova"
     * birden çok yerde geçiyor. İlsiz bir ilçe süzgeci yanlış ilin işlerini
     * getirirdi.
     */
    expect(suzgecHref('/ilanlar', '', null, 'Beşiktaş')).toBe('/ilanlar');
    expect(suzgecHref('/ilanlar', '', '34', 'Beşiktaş')).toBe('/ilanlar?il=34&ilce=Be%C5%9Fikta%C5%9F');
  });

  it('sürücü paneli aynı kuralı kullanıyor', () => {
    expect(suzgecHref('/nakliyeci', '', '06')).toBe('/nakliyeci?il=06');
  });
});

describe('kenarNoktasi', () => {
  const kutu = { x0: 0, y0: 0, x1: 100, y1: 100 };

  it('dışarı çıkan ucu kenara taşıyor', () => {
    // İl dışı rotanın oku, hedefin bulunduğu görünmez yerde değil kenarda durmalı
    expect(kenarNoktasi({ x: 50, y: 50 }, { x: 300, y: 50 }, kutu)).toEqual({ x: 100, y: 50 });
    expect(kenarNoktasi({ x: 50, y: 50 }, { x: 50, y: -300 }, kutu)).toEqual({ x: 50, y: 0 });
  });

  it('içeride biten rotayı olduğu gibi bırakıyor', () => {
    expect(kenarNoktasi({ x: 10, y: 10 }, { x: 80, y: 40 }, kutu)).toEqual({ x: 80, y: 40 });
  });

  it('köşeye giden rotada kesişimi doğru buluyor', () => {
    const u = kenarNoktasi({ x: 50, y: 50 }, { x: 150, y: 150 }, kutu)!;
    expect(u.x).toBeCloseTo(100);
    expect(u.y).toBeCloseTo(100);
  });

  it('kutuyu hiç kesmeyen rotada null dönüyor', () => {
    expect(kenarNoktasi({ x: 200, y: 200 }, { x: 300, y: 300 }, kutu)).toBeNull();
  });

  it('sıfır uzunluklu rotada çökmüyor', () => {
    // Aynı ilçeden aynı ilçeye bir ilan katalog hatasıyla oluşabiliyor
    expect(kenarNoktasi({ x: 50, y: 50 }, { x: 50, y: 50 }, kutu)).toEqual({ x: 50, y: 50 });
  });
});
