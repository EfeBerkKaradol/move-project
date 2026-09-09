import { describe, expect, it } from 'vitest';
import { anaCevir, pencereAraligi } from './PickupWindow';

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
