import { describe, expect, it } from 'vitest';
import { anaCevir, cozumle, pencereAraligi } from './PickupWindow';

/**
 * Alış penceresi üretimi. Sunucu geçmiş pencereyi reddediyor; bu testin işi o
 * reddin kullanıcıya hiç ulaşmaması — seçim anında yakalanması.
 */
describe('alış penceresi', () => {
  const gun = '2026-09-12';

  it('gün ve aralık seçiliyse ISO başlangıç ve bitiş üretir', () => {
    const simdi = anaCevir('2026-09-10', '10:00');
    const aralik = pencereAraligi(gun, 'sabah', simdi);
    expect(aralik).not.toBeNull();
    expect(new Date(aralik!.start).getTime()).toBeLessThan(new Date(aralik!.end).getTime());
  });

  it('yerel saati koruyor', () => {
    const aralik = pencereAraligi(gun, 'ogleden-sonra', anaCevir('2026-09-10', '10:00'))!;
    // 12:00–17:00 yerel: ISO'ya çevrilip geri okununca aynı yerel saatler çıkmalı
    expect(new Date(aralik.start).getHours()).toBe(12);
    expect(new Date(aralik.end).getHours()).toBe(17);
  });

  it('gün seçilmemişse null', () => {
    expect(pencereAraligi('', 'sabah')).toBeNull();
  });

  it('aralık seçilmemişse null', () => {
    expect(pencereAraligi(gun, '')).toBeNull();
  });

  /** Bugünün bitmiş aralığı: sunucuya gitmeden burada eleniyor. */
  it('bitişi geçmiş aralık null', () => {
    const simdi = anaCevir(gun, '13:00');
    expect(pencereAraligi(gun, 'sabah', simdi)).toBeNull();
    // aynı gün, henüz bitmemiş aralık geçerli kalıyor
    expect(pencereAraligi(gun, 'aksam', simdi)).not.toBeNull();
  });

  it('tanınmayan aralık kimliği null', () => {
    expect(pencereAraligi(gun, 'gece-yarisi')).toBeNull();
  });

  it('geçersiz gün null', () => {
    expect(pencereAraligi('abc', 'sabah')).toBeNull();
  });
});

/**
 * Fiyat adımında seçilen aralık, ilan adımına URL ile taşınıyor ve orada geri
 * çözülüyor. Çözüm bozulursa kullanıcı aynı soruyu iki kez cevaplar — ve bunu
 * ancak giriş yapıp deneyerek fark ederiz.
 */
describe('önceki adımdan devralma', () => {
  it('kendi ürettiği aralığı geri çözüyor', () => {
    const aralik = pencereAraligi('2026-09-12', 'sabah', anaCevir('2026-09-10', '10:00'))!;
    expect(cozumle(aralik)).toEqual({ gun: '2026-09-12', pencere: 'sabah' });
  });

  it('üç aralığın hepsi için geçerli', () => {
    for (const id of ['sabah', 'ogleden-sonra', 'aksam']) {
      const aralik = pencereAraligi('2026-10-01', id, anaCevir('2026-09-10', '10:00'))!;
      expect(cozumle(aralik).pencere).toBe(id);
    }
  });

  it('değer yoksa boş', () => {
    expect(cozumle(null)).toEqual({ gun: '', pencere: '' });
    expect(cozumle(undefined)).toEqual({ gun: '', pencere: '' });
  });

  /** Elle kurcalanmış URL formu kilitlemesin: tanınmayan saat boş seçim demek. */
  it('hazır aralığa denk gelmeyen saat boş pencere', () => {
    expect(cozumle({ start: '2026-09-12T06:30:00.000Z', end: '2026-09-12T09:00:00.000Z' }).pencere).toBe('');
  });

  it('bozuk tarih boş', () => {
    expect(cozumle({ start: 'abc', end: 'def' })).toEqual({ gun: '', pencere: '' });
  });
});
