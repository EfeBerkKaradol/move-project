import { describe, expect, it } from 'vitest';
import { formatPhone, normalizePhone } from './PhoneInput';
import { formatPlate } from './PlateInput';

describe('telefon', () => {
  it('farklı yazımları tek biçime indirir', () => {
    // Kullanıcı numarayı beş ayrı şekilde yazabiliyor; sunucuya hepsi aynı gitmeli
    expect(normalizePhone('05321234567')).toBe('05321234567');
    expect(normalizePhone('5321234567')).toBe('05321234567');
    expect(normalizePhone('+90 532 123 45 67')).toBe('05321234567');
    expect(normalizePhone('0532 123 45 67')).toBe('05321234567');
    expect(normalizePhone('905321234567')).toBe('05321234567');
  });

  it('fazla haneyi almaz', () => {
    expect(normalizePhone('053212345670000')).toBe('05321234567');
  });

  it('boş girdide boş kalır', () => {
    // "0" döndürseydi sunucu doğrulaması boş olmayan ama geçersiz bir numara görürdü
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('abc')).toBe('');
  });

  it('okunması için gruplar', () => {
    expect(formatPhone('05321234567')).toBe('0532 123 45 67');
    expect(formatPhone('0532123')).toBe('0532 123');
    expect(formatPhone('')).toBe('');
  });

  it('gönderilen değer boşluk taşımaz', () => {
    // Sunucudaki doğrulama ^(\+90|0)?5\d{9}$ — boşluklu metni reddeder
    expect(normalizePhone(formatPhone('05321234567'))).toMatch(/^0\d{10}$/);
  });
});

describe('plaka', () => {
  it('şablona oturtur', () => {
    expect(formatPlate('34abc123')).toBe('34 ABC 123');
    expect(formatPlate('34 ABC 123')).toBe('34 ABC 123');
    expect(formatPlate('06A1234')).toBe('06 A 1234');
  });

  it('Türkçe harfleri karşılığına çevirir', () => {
    // Plakada Türkçe harf kullanılmıyor; klavyeden gelen İ/Ş/Ğ düşürülmemeli, çevrilmeli
    expect(formatPlate('34işç12')).toBe('34 ISC 12');
  });

  it('şablona uymayanı düşürür', () => {
    expect(formatPlate('!!34!!ABC!!123!!')).toBe('34 ABC 123');
    // Plaka il koduyla başlar; harfle başlayan girdi sunucuda reddedilirdi
    expect(formatPlate('ABC34')).toBe('34');
    expect(formatPlate('A')).toBe('');
  });

  it('harf ve rakam sınırlarını aşmaz', () => {
    expect(formatPlate('34ABCDEF1234567')).toBe('34 ABC 12345');
  });

  it('yazarken ara durumları bozmaz', () => {
    // Kullanıcı harf harf yazıyor; her adımda değer geçerli kalmalı
    expect(formatPlate('3')).toBe('3');
    expect(formatPlate('34')).toBe('34');
    expect(formatPlate('34A')).toBe('34 A');
  });
});
