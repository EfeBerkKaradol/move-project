import { describe, expect, it } from 'vitest';
import { isPageNavigation } from './navigation';

const here = new URL('https://karinca.tech/fiyat-hesapla?from=1');
const link = (href: string, extra: Partial<{ target: string; download: string }> = {}) => ({
  href,
  target: '',
  download: '',
  ...extra,
});

describe('isPageNavigation', () => {
  it('aynı origin, farklı yol → geçiş', () => {
    expect(isPageNavigation(link('/ilanlar'), here)).toBe(true);
    expect(isPageNavigation(link('https://karinca.tech/'), here)).toBe(true);
  });

  it('sorgu değişince de geçiş', () => {
    expect(isPageNavigation(link('/fiyat-hesapla?from=2'), here)).toBe(true);
  });

  it('aynı sayfadaki çapa geçiş değil', () => {
    expect(isPageNavigation(link('/fiyat-hesapla?from=1#arac'), here)).toBe(false);
    expect(isPageNavigation(link('#arac'), here)).toBe(false);
  });

  it('başka sayfadaki çapa geçiş', () => {
    expect(isPageNavigation(link('/#nasil-calisir'), here)).toBe(true);
  });

  it('yeni sekme, indirme ve dış alan adı dışarıda', () => {
    expect(isPageNavigation(link('/ilanlar', { target: '_blank' }), here)).toBe(false);
    expect(isPageNavigation(link('/rapor.pdf', { download: 'rapor.pdf' }), here)).toBe(false);
    expect(isPageNavigation(link('https://openstreetmap.org/'), here)).toBe(false);
    expect(isPageNavigation(link('mailto:x@y.z'), here)).toBe(false);
  });
});
