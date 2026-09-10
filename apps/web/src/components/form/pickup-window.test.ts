import { describe, expect, it } from 'vitest';
import {
  anaCevir,
  araligiCoz,
  cozumle,
  dilimSaatleri,
  dilimiBul,
  saatKatari,
} from './PickupWindow';

/**
 * Alış penceresinin kırılgan yeri gece yarısı geçişi: "12 Eylül gecesi 02:00"
 * takvimde 13 Eylül'e düşüyor. Çeviri iki yönde de aynı günü vermezse kullanıcı
 * ilan adımında bir gün kaymış bir tarih görür — ya da daha kötüsü, araç
 * seçtiğinden on sekiz saat önce gelir.
 */

const gun = '2026-09-12';
/** Testler "şimdi"yi kendi veriyor; yoksa sonuç makinenin saatine bağlı kalırdı. */
const simdi = anaCevir('2026-09-10', 10);

const slot = (bas: number, bit: number) => ({ bas, bit });

describe('dilimSaatleri', () => {
  it('sabah 06:00 ile 12:00 arasını saatlere bölüyor', () => {
    const saatler = dilimSaatleri('sabah');
    expect(saatler).toHaveLength(6);
    expect(saatler[0]).toEqual(slot(6, 7));
    expect(saatler.at(-1)).toEqual(slot(11, 12));
  });

  it('öğleden sonra 12:00–17:00', () => {
    const saatler = dilimSaatleri('ogleden-sonra');
    expect(saatler).toHaveLength(5);
    expect(saatler[0]).toEqual(slot(12, 13));
    expect(saatler.at(-1)).toEqual(slot(16, 17));
  });

  it('akşam 17:00–22:00', () => {
    const saatler = dilimSaatleri('aksam');
    expect(saatler).toHaveLength(5);
    expect(saatler[0]).toEqual(slot(17, 18));
    expect(saatler.at(-1)).toEqual(slot(21, 22));
  });

  it('gece 22:00–06:00, gece yarısını geçerek', () => {
    const saatler = dilimSaatleri('gece');
    expect(saatler).toHaveLength(8);
    expect(saatler[0]).toEqual(slot(22, 23));
    // 30 = ertesi gün 06:00
    expect(saatler.at(-1)).toEqual(slot(29, 30));
  });

  it('dilimler kesişmiyor ve boşluk bırakmıyor', () => {
    const hepsi = ['sabah', 'ogleden-sonra', 'aksam', 'gece'].flatMap(dilimSaatleri);
    // 06:00'dan ertesi 06:00'a kadar kesintisiz zincir
    expect(hepsi[0].bas).toBe(6);
    expect(hepsi.at(-1)!.bit).toBe(30);
    hepsi.slice(1).forEach((s, i) => expect(s.bas).toBe(hepsi[i].bit));
  });

  it('tanınmayan dilimde boş dönüyor', () => {
    expect(dilimSaatleri('kusluk')).toEqual([]);
  });
});

describe('saatKatari', () => {
  it('24 ve sonrasını ertesi güne sarıyor', () => {
    expect(saatKatari(6)).toBe('06:00');
    expect(saatKatari(23)).toBe('23:00');
    expect(saatKatari(24)).toBe('00:00');
    expect(saatKatari(30)).toBe('06:00');
  });
});

describe('dilimiBul', () => {
  it('sınırlar üst dilime değil kendi dilimine ait', () => {
    expect(dilimiBul(6)).toBe('sabah');
    expect(dilimiBul(11)).toBe('sabah');
    expect(dilimiBul(12)).toBe('ogleden-sonra');
    expect(dilimiBul(17)).toBe('aksam');
    expect(dilimiBul(22)).toBe('gece');
    expect(dilimiBul(29)).toBe('gece');
  });

  it('dilim dışındaki saatte null', () => {
    // 05:00 seçilen günün değil, bir önceki günün gecesine ait
    expect(dilimiBul(5)).toBeNull();
    expect(dilimiBul(30)).toBeNull();
  });
});

describe('araligiCoz', () => {
  it('seçimi mutlak aralığa çeviriyor', () => {
    const sonuc = araligiCoz(gun, slot(8, 9), simdi);
    expect(sonuc.durum).toBe('tamam');
    if (sonuc.durum !== 'tamam') return;
    expect(sonuc.start).toBe(anaCevir(gun, 8).toISOString());
    expect(sonuc.end).toBe(anaCevir(gun, 9).toISOString());
  });

  it('gece yarısına dayanan seçim ertesi günde bitiyor', () => {
    const sonuc = araligiCoz(gun, slot(23, 24), simdi);
    if (sonuc.durum !== 'tamam') throw new Error('aralık üretilemedi');
    expect(new Date(sonuc.start).getDate()).toBe(12);
    expect(new Date(sonuc.start).getHours()).toBe(23);
    expect(new Date(sonuc.end).getDate()).toBe(13);
    expect(new Date(sonuc.end).getHours()).toBe(0);
  });

  it('gece yarısından sonraki saat ertesi güne düşüyor', () => {
    // "12 Eylül gecesi 02:00" = 13 Eylül 02:00. Aynı güne yazsaydık araç
    // kullanıcının seçtiği andan on sekiz saat önce gelirdi.
    const sonuc = araligiCoz(gun, slot(26, 27), simdi);
    if (sonuc.durum !== 'tamam') throw new Error('aralık üretilemedi');
    const bas = new Date(sonuc.start);
    expect(bas.getDate()).toBe(13);
    expect(bas.getHours()).toBe(2);
  });

  it('eksik seçimde hata değil "eksik" diyor', () => {
    // Kullanıcı henüz saat seçmediyse kırmızı yazı çıkmamalı
    expect(araligiCoz(gun, null, simdi).durum).toBe('eksik');
    expect(araligiCoz('', slot(8, 9), simdi).durum).toBe('eksik');
  });

  it('geçmiş saati reddediyor', () => {
    const bugun = '2026-09-10';
    expect(araligiCoz(bugun, slot(8, 9), simdi).durum).toBe('gecersiz');
    // Aynı gün, henüz gelmemiş saat geçerli
    expect(araligiCoz(bugun, slot(17, 18), simdi).durum).toBe('tamam');
  });

  it('bugünün gecesi, gece yarısını geçse de geçerli', () => {
    // Saat 10:00; bu gecenin 02:00'si hâlâ gelecekte
    expect(araligiCoz('2026-09-10', slot(26, 27), simdi).durum).toBe('tamam');
  });

  it('okunamayan tarihte çökmüyor', () => {
    const sonuc = araligiCoz('abc', slot(8, 9), simdi);
    expect(sonuc.durum).toBe('gecersiz');
    if (sonuc.durum === 'gecersiz') expect(sonuc.mesaj).toMatch(/okunamadı/);
  });

  it('ters aralığı reddediyor', () => {
    expect(araligiCoz(gun, slot(9, 8), simdi).durum).toBe('gecersiz');
  });
});

describe('cozumle', () => {
  /*
   * Seçim fiyat adımından ilan adımına URL ile taşınıyor. Bu çözüm bozulursa
   * kullanıcı aynı soruyu iki kez cevaplar — ya da bir gün kaymış bir tarih
   * görür ve bunu ancak giriş yapıp deneyerek fark ederiz.
   */
  const gidipGel = (bas: number, bit: number) => {
    const sonuc = araligiCoz(gun, slot(bas, bit), simdi);
    if (sonuc.durum !== 'tamam') throw new Error('aralık üretilemedi');
    return cozumle({ start: sonuc.start, end: sonuc.end });
  };

  it('sabah seçimini geri çözüyor', () => {
    expect(gidipGel(8, 9)).toEqual({ gun, slot: slot(8, 9) });
  });

  it('akşam seçimini geri çözüyor', () => {
    expect(gidipGel(21, 22)).toEqual({ gun, slot: slot(21, 22) });
  });

  it('gece yarısına dayanan seçimi geri çözüyor', () => {
    expect(gidipGel(23, 24)).toEqual({ gun, slot: slot(23, 24) });
  });

  it('gece yarısından sonraki seçimi seçildiği güne geri veriyor', () => {
    // Takvimde 13 Eylül 02:00 ama kullanıcının seçtiği "12 Eylül gecesi"
    expect(gidipGel(26, 27)).toEqual({ gun, slot: slot(26, 27) });
  });

  it('gecenin son saatini geri çözüyor', () => {
    expect(gidipGel(29, 30)).toEqual({ gun, slot: slot(29, 30) });
  });

  it('geri çözülen seçim hâlâ bir dilime ait', () => {
    const { slot: s } = gidipGel(26, 27);
    expect(dilimiBul(s!.bas)).toBe('gece');
  });

  it('seçim yoksa boş dönüyor', () => {
    expect(cozumle(null)).toEqual({ gun: '', slot: null });
    expect(cozumle(undefined)).toEqual({ gun: '', slot: null });
  });

  it('bozuk tarihte çökmüyor', () => {
    // URL elle kurcalanabiliyor; form kilitlenmemeli
    expect(cozumle({ start: 'abc', end: 'def' })).toEqual({ gun: '', slot: null });
  });
});
