import type { CargoItem, VehicleType } from '@tasiyoruz/contracts';
import { describe, expect, it } from 'vitest';
import { fitWarning, summarize } from './CargoDeclaration';

const item = (over: Partial<CargoItem>): CargoItem => ({
  code: 'X', categoryCode: 'TEKIL_ESYA', displayName: 'X',
  volumeM3: 1, weightKg: 10, longestEdgeCm: 100, ...over,
});

const ITEMS = [
  item({ code: 'KOLI_STANDART', volumeM3: 0.12, weightKg: 12, longestEdgeCm: 60 }),
  item({ code: 'KOLTUK_3LU', volumeM3: 1.3, weightKg: 60, longestEdgeCm: 220 }),
  item({ code: 'KOLTUK_L', volumeM3: 2.6, weightKg: 120, longestEdgeCm: 290 }),
];

const vehicle = (over: Partial<VehicleType>): VehicleType => ({
  code: 'PANELVAN', displayName: 'Panelvan', volumeM3: 8, payloadKg: 1000,
  innerLengthCm: 240, exampleLoads: null, active: true, sortOrder: 1, ...over,
});

describe('beyan toplamı', () => {
  it('adetle çarpar ve en uzun kenarı taşır', () => {
    const t = summarize(ITEMS, { KOLI_STANDART: 8, KOLTUK_3LU: 1 });
    expect(t.pieces).toBe(9);
    expect(t.volumeM3).toBeCloseTo(2.26, 5);
    expect(t.weightKg).toBe(156);
    // Toplanmaz, en büyüğü alınır: iki koltuk yan yana konunca uzunluk ikiye katlanmıyor
    expect(t.longestEdgeCm).toBe(220);
  });

  it('katalogda olmayan kodu yok sayar', () => {
    expect(summarize(ITEMS, { YOK: 3 }).pieces).toBe(0);
  });

  it('seçim boşken sıfır', () => {
    expect(summarize(ITEMS, {})).toEqual({ pieces: 0, volumeM3: 0, weightKg: 0, longestEdgeCm: 0 });
  });
});

describe('araç uyarısı', () => {
  it('sığan yükte uyarı yok', () => {
    expect(fitWarning(summarize(ITEMS, { KOLI_STANDART: 8 }), vehicle({}))).toBeNull();
  });

  /** L koltuk 290 cm; panelvan kasası 240. Hacim ve ağırlık yetse de sığmıyor. */
  it('en uzun kenar kasadan uzunsa uyarır', () => {
    const warning = fitWarning(summarize(ITEMS, { KOLTUK_L: 1 }), vehicle({}));
    expect(warning).toContain('290');
    expect(warning).toContain('240');
  });

  it('ağırlık kapasiteyi aşarsa uyarır', () => {
    const warning = fitWarning(summarize(ITEMS, { KOLI_STANDART: 90 }), vehicle({ payloadKg: 800, volumeM3: 40 }));
    expect(warning).toContain('kg');
  });

  /** Kasa tam dolmuyor; %90 eşiği bunu hesaba katıyor. */
  it('hacmin %90ını geçince uyarır, altında susar', () => {
    const kucuk = vehicle({ volumeM3: 1.5, payloadKg: 5000, innerLengthCm: 400 });
    expect(fitWarning(summarize(ITEMS, { KOLI_STANDART: 11 }), kucuk)).toBeNull();  // 1,32 m³
    expect(fitWarning(summarize(ITEMS, { KOLI_STANDART: 12 }), kucuk)).toContain('m³'); // 1,44 m³
  });

  /** Sıra önemli: hem uzun hem ağır bir yükte kullanıcıya en belirleyici sebep söylenmeli. */
  it('uzunluk sorunu ağırlığın önüne geçer', () => {
    const warning = fitWarning(summarize(ITEMS, { KOLTUK_L: 1, KOLI_STANDART: 200 }), vehicle({ payloadKg: 100 }));
    expect(warning).toContain('cm');
  });
});
