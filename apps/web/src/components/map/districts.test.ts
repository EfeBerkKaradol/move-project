import { describe, expect, it } from 'vitest';
import { MAP_BOX } from '@/components/hero/geo-data';
import { PROVINCE_SHAPES } from './province-shapes';
import { DISTRICTS_BY_PROVINCE } from './district-shapes';
import { districtsOf } from './districts';

/**
 * İlçe sınırları üretilmiş veri; test biçimi değil <em>varsayımları</em>
 * koruyor. Kaynak dosya ilin adını taşımıyor, ilçeler nokta-poligon testiyle
 * atanıyor — bir ada yanlış ile düştüğünde bunu ancak haritaya bakan biri fark
 * eder, ve bakan olmayabilir.
 */
describe('DISTRICTS_BY_PROVINCE', () => {
  it('81 ilin tamamının ilçesi var', () => {
    expect(Object.keys(DISTRICTS_BY_PROVINCE)).toHaveLength(81);
    for (const [il, ilceler] of Object.entries(DISTRICTS_BY_PROVINCE)) {
      expect(ilceler.length, il).toBeGreaterThan(0);
    }
  });

  it('toplam 973 ilçe', () => {
    const toplam = Object.values(DISTRICTS_BY_PROVINCE).reduce((t, l) => t + l.length, 0);
    expect(toplam).toBe(973);
  });

  it('bilinen il ilçe sayıları tutuyor', () => {
    /*
     * Ada ilçeleri hiçbir ilin sınırının içine düşmüyor ve en yakın ile
     * atanıyor. "En yakın il merkezi" denendi ve yanlış yazdı: Adalar
     * Yalova'ya, Marmara Adası Tekirdağ'a düştü. Ada karşı kıyıya değil en
     * yakın kıyıya aittir — bu sayılar o kuralı bağlıyor.
     */
    const beklenen: [string, number][] = [
      ['İstanbul', 39],
      ['Balıkesir', 20],
      ['Yalova', 6],
      ['Tekirdağ', 11],
      ['Çanakkale', 12],
      ['Ankara', 25],
    ];
    for (const [il, sayi] of beklenen) {
      expect(districtsOf(il).length, il).toBe(sayi);
    }
  });

  it('adalar kendi iline yazılmış', () => {
    expect(districtsOf('İstanbul').map((d) => d.name)).toContain('Adalar');
    expect(districtsOf('Balıkesir').map((d) => d.name)).toContain('Marmara');
  });

  it('kaynaktaki yabancı adlar Türkçeye çevrilmiş', () => {
    // Kullanıcıya "Prince Islands" göstermek, ilanın "Adalar" yazan ilçesiyle
    // eşleşmiyor
    const hepsi = Object.values(DISTRICTS_BY_PROVINCE).flat().map((d) => d.name);
    expect(hepsi).not.toContain('Prince Islands');
    expect(hepsi).not.toContain('Imbros');
    expect(hepsi).not.toContain('Ulukisla');
    expect(districtsOf('Çanakkale').map((d) => d.name)).toContain('Gökçeada');
  });

  it('her ilçenin kapalı bir yolu var', () => {
    for (const [il, ilceler] of Object.entries(DISTRICTS_BY_PROVINCE)) {
      for (const ilce of ilceler) {
        expect(ilce.d.startsWith('M'), `${il}/${ilce.name}`).toBe(true);
        expect(ilce.d.endsWith('Z'), `${il}/${ilce.name}`).toBe(true);
      }
    }
  });

  it('ilçeler il haritasıyla aynı kutuda', () => {
    // Ayrı bir projeksiyona düşselerdi ilin üstüne oturmazlardı
    const sayilar = districtsOf('Ankara')
      .flatMap((d) => d.d.match(/-?\d+(\.\d+)?/g) ?? [])
      .map(Number);
    const xs = sayilar.filter((_, i) => i % 2 === 0);
    const ys = sayilar.filter((_, i) => i % 2 === 1);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(MAP_BOX.w);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(MAP_BOX.h);
  });

  it('il adları il haritasındakilerle eşleşiyor', () => {
    // Eşleşmeseydi o ilin ilçeleri hiç çizilmezdi
    for (const il of PROVINCE_SHAPES) {
      expect(districtsOf(il.name).length, il.name).toBeGreaterThan(0);
    }
  });

  it('tek bir ilin verisi makul boyutta', () => {
    /*
     * Sayfa yalnızca seçili ilinkini gönderiyor; tamamı 366 KB. En büyük il
     * bile 45 KB'ın altında kalmalı, yoksa il seçmek gezinmeyi yavaşlatır.
     */
    const enBuyuk = Math.max(
      ...Object.values(DISTRICTS_BY_PROVINCE).map((l) => l.reduce((t, d) => t + d.d.length, 0)),
    );
    expect(enBuyuk).toBeLessThan(45_000);
  });

  it('tanınmayan ya da boş il adında çökmüyor', () => {
    expect(districtsOf(null)).toEqual([]);
    expect(districtsOf('')).toEqual([]);
    expect(districtsOf('Atlantis')).toEqual([]);
  });

  it('şapkalı yazımı normalize ederek buluyor', () => {
    // Kaynak "Hakkâri", veritabanı "Hakkari"
    expect(districtsOf('Hakkari').length).toBeGreaterThan(0);
    expect(districtsOf('Hakkâri').length).toBeGreaterThan(0);
  });
});
