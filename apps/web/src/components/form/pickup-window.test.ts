import { describe, expect, it } from 'vitest';
import { anaCevir, araligiCoz, cozumle } from './PickupWindow';

/**
 * Alış penceresinin kırılgan yeri saat dilimi ve gün sınırı: kullanıcı kendi
 * saatini yazıyor, sunucu mutlak zaman bekliyor. Aradaki çeviri sessizce
 * kayarsa ilan yanlış saate açılır ve bunu kimse fark etmez.
 */

const gun = '2026-09-12';
/** Testler "şimdi"yi kendi veriyor; yoksa sonuç makinenin saatine bağlı kalırdı. */
const simdi = anaCevir('2026-09-10', '10:00');

describe('araligiCoz', () => {
  it('gün ve saatleri mutlak aralığa çevirir', () => {
    const sonuc = araligiCoz(gun, '08:00', '12:00', simdi);
    expect(sonuc.durum).toBe('tamam');
    if (sonuc.durum !== 'tamam') return;
    expect(sonuc.start).toBe(anaCevir(gun, '08:00').toISOString());
    expect(sonuc.end).toBe(anaCevir(gun, '12:00').toISOString());
  });

  it('hazır aralıkların dışındaki saatleri de kabul ediyor', () => {
    // "Tüm saatler" isteğinin karşılığı: 05:30–07:00 hiçbir hazır aralığa denk
    // gelmiyor ama geçerli bir taleptir.
    const sonuc = araligiCoz(gun, '05:30', '07:00', simdi);
    expect(sonuc.durum).toBe('tamam');
  });

  it('gece yarısına kadar süren aralığı kabul ediyor', () => {
    expect(araligiCoz(gun, '22:00', '23:59', simdi).durum).toBe('tamam');
  });

  it('eksik alanlarda hata değil "eksik" diyor', () => {
    // Kullanıcı henüz doldurmadıysa kırmızı yazı çıkmamalı
    expect(araligiCoz('', '08:00', '12:00', simdi).durum).toBe('eksik');
    expect(araligiCoz(gun, '', '12:00', simdi).durum).toBe('eksik');
    expect(araligiCoz(gun, '08:00', '', simdi).durum).toBe('eksik');
  });

  it('bitiş başlangıçtan önceyse reddediyor', () => {
    const sonuc = araligiCoz(gun, '14:00', '09:00', simdi);
    expect(sonuc.durum).toBe('gecersiz');
    if (sonuc.durum === 'gecersiz') expect(sonuc.mesaj).toMatch(/sonra olmalı/);
  });

  it('başlangıçla bitiş aynıysa reddediyor', () => {
    expect(araligiCoz(gun, '09:00', '09:00', simdi).durum).toBe('gecersiz');
  });

  it('bir saatten kısa aralığı reddediyor', () => {
    // Kimsenin teklif veremeyeceği pencere, ilan açılmadan durduruluyor
    const sonuc = araligiCoz(gun, '09:00', '09:30', simdi);
    expect(sonuc.durum).toBe('gecersiz');
    if (sonuc.durum === 'gecersiz') expect(sonuc.mesaj).toMatch(/en az/);
    expect(araligiCoz(gun, '09:00', '10:00', simdi).durum).toBe('tamam');
  });

  it('geçmiş aralığı reddediyor', () => {
    const bugun = '2026-09-10';
    expect(araligiCoz(bugun, '08:00', '09:30', simdi).durum).toBe('gecersiz');
    // Aynı gün, henüz gelmemiş aralık geçerli
    expect(araligiCoz(bugun, '17:00', '20:00', simdi).durum).toBe('tamam');
  });

  it('okunamayan tarihte çökmüyor', () => {
    const sonuc = araligiCoz('abc', '08:00', '12:00', simdi);
    expect(sonuc.durum).toBe('gecersiz');
    if (sonuc.durum === 'gecersiz') expect(sonuc.mesaj).toMatch(/okunamadı/);
  });
});

describe('cozumle', () => {
  /*
   * Fiyat adımında seçilen aralık ilan adımına URL ile taşınıyor. Bu çözüm
   * bozulursa kullanıcı aynı soruyu iki kez cevaplar — ve bunu ancak giriş
   * yapıp deneyerek fark ederiz.
   */
  it('kendi ürettiği aralığı geri çözüyor', () => {
    const sonuc = araligiCoz(gun, '08:00', '12:00', simdi);
    if (sonuc.durum !== 'tamam') throw new Error('aralık üretilemedi');
    expect(cozumle({ start: sonuc.start, end: sonuc.end })).toEqual({
      gun,
      bas: '08:00',
      bit: '12:00',
    });
  });

  it('hazır aralık olmayan saatleri de geri çözüyor', () => {
    const sonuc = araligiCoz(gun, '05:30', '07:15', simdi);
    if (sonuc.durum !== 'tamam') throw new Error('aralık üretilemedi');
    expect(cozumle({ start: sonuc.start, end: sonuc.end })).toEqual({
      gun,
      bas: '05:30',
      bit: '07:15',
    });
  });

  it('seçim yoksa boş dönüyor', () => {
    expect(cozumle(null)).toEqual({ gun: '', bas: '', bit: '' });
    expect(cozumle(undefined)).toEqual({ gun: '', bas: '', bit: '' });
  });

  it('bozuk tarihte çökmüyor', () => {
    // URL elle kurcalanabiliyor; form kilitlenmemeli
    expect(cozumle({ start: 'abc', end: 'def' })).toEqual({ gun: '', bas: '', bit: '' });
  });
});
