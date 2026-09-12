import { describe, expect, it } from 'vitest';
import { girisHref, otherRole, roleCopy } from './signup-role';

/**
 * Kayıt akışının iki kapısı. Yanlış kapıya düşen kullanıcı, kendisini
 * ilgilendirmeyen bir listeyi okuyor: yükü olan kişiye ehliyet ve ruhsat
 * anlatılıyordu.
 */
describe('roleCopy', () => {
  it('taşıyıcı kapısı belgeleri anlatıyor', () => {
    const c = roleCopy('tasiyici');
    expect(c.role).toBe('tasiyici');
    expect(c.landing).toBe('/sofor-ol');
    expect(c.next.join(' ')).toMatch(/ehliyet|ruhsat|sigorta/i);
  });

  it('yük veren kapısı belge istemediğini söylüyor', () => {
    const c = roleCopy('yuk-veren');
    expect(c.landing).toBe('/panel');
    expect(c.next.join(' ')).toMatch(/belge istemiyoruz/i);
  });

  it('tanınmayan ve boş değerde yük verene düşüyor', () => {
    // Çoğunluk oradan geliyor; elle kurcalanmış bir URL formu kilitlememeli
    expect(roleCopy(undefined).role).toBe('yuk-veren');
    expect(roleCopy('').role).toBe('yuk-veren');
    expect(roleCopy('baskabirsey').role).toBe('yuk-veren');
  });

  it('karşı rol her iki yönde de doğru', () => {
    expect(otherRole('tasiyici').role).toBe('yuk-veren');
    expect(otherRole('yuk-veren').role).toBe('tasiyici');
  });
});

describe('girisHref', () => {
  it('rolü taşıyor', () => {
    expect(girisHref('tasiyici')).toBe('/giris?rol=tasiyici');
  });

  it('callbackUrl korunuyor', () => {
    /*
     * Kapılar arası geçişte hedef kaybolursa kullanıcı fiyat adımında
     * doldurduğu her şeyi yeniden doldurur.
     */
    expect(girisHref('yuk-veren', '/panel/ilan/yeni?arac=PANELVAN')).toBe(
      '/giris?rol=yuk-veren&callbackUrl=%2Fpanel%2Filan%2Fyeni%3Farac%3DPANELVAN',
    );
  });

  it('hedef yokken yalnızca rol yazılıyor', () => {
    expect(girisHref('yuk-veren', null)).toBe('/giris?rol=yuk-veren');
  });
});
