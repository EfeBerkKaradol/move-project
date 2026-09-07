import { describe, expect, it } from 'vitest';
import { MARKS, clamp01, ramp, sceneAt } from './timeline';

describe('ramp', () => {
  it('aralık dışında 0 ve 1 doyar', () => {
    expect(ramp(0.1, 0.2, 0.4)).toBe(0);
    expect(ramp(0.5, 0.2, 0.4)).toBe(1);
  });

  it('aralık ortasında yarıyı verir ve monoton artar', () => {
    expect(ramp(0.3, 0.2, 0.4)).toBeCloseTo(0.5, 5);
    expect(ramp(0.25, 0.2, 0.4)).toBeLessThan(ramp(0.35, 0.2, 0.4));
  });
});

describe('clamp01', () => {
  it('sınırların dışını kırpar', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(7)).toBe(1);
    expect(clamp01(0.42)).toBe(0.42);
  });
});

describe('sceneAt', () => {
  it('başlangıçta yalnızca açılış metni görünür, harita ve araç yok', () => {
    const s = sceneAt(0);
    expect(s.texts.intro).toBe(1);
    expect(s.mapIn).toBe(0);
    expect(s.truckIn).toBe(0);
    expect(s.outboundDraw).toBe(0);
  });

  it('sonda anlatı tamamlanır: her iki rota çizili, dönüş yüklü, kapanış açık', () => {
    const s = sceneAt(1);
    expect(s.outboundDraw).toBe(1);
    expect(s.returnLoaded).toBe(1);
    expect(s.texts.outro).toBe(1);
    expect(s.texts.intro).toBe(0);
    // Kapanışta "boş dönüş" cümlesi yerini bırakmış olmalı
    expect(s.texts.empty).toBe(0);
  });

  it('araç gidiş rotasını dönüşten önce bitirir', () => {
    const mid = sceneAt(MARKS.outbound[1]);
    expect(mid.leg).toBe('out');
    expect(mid.legProgress).toBe(1);

    const back = sceneAt(0.9);
    expect(back.leg).toBe('back');
    expect(back.legProgress).toBeGreaterThan(0);
  });

  it('düğümler rotanın sırasına göre aktifleşir', () => {
    const atAnkara = sceneAt(MARKS.ankara[1]);
    expect(atAnkara.nodes.istanbul).toBe(1);
    expect(atAnkara.nodes.ankara).toBe(1);
    expect(atAnkara.nodes.izmir).toBe(0);
  });

  it('dönüş rotası araç yola çıkmadan önce görünür — "boş dönecek" fikri önce gelir', () => {
    const s = sceneAt(MARKS.empty[1]);
    expect(s.returnDraw).toBeGreaterThan(0);
    expect(s.leg).toBe('out');
  });

  it('aynı anda en fazla bir kart baskın olur', () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const { cards } = sceneAt(p);
      const strong = [cards.cargo, cards.match, cards.newLoad].filter((a) => a > 0.5);
      expect(strong.length).toBeLessThanOrEqual(1);
    }
  });

  it('aralık dışı ilerleme kırpılır', () => {
    expect(sceneAt(-1)).toEqual(sceneAt(0));
    expect(sceneAt(4)).toEqual(sceneAt(1));
  });
});
