import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { accent, cream, dark } from '@tasiyoruz/theme';

/**
 * Renkler iki yerde tanımlı: burada okunan CSS ve @tasiyoruz/theme.
 *
 * <p>Tek yerde tutulamıyor — React Native CSS değişkeni okuyamıyor, Tailwind de
 * TS'ten token üretmiyor. İkisinin ayrışması sessiz bir hata: mobil uygulama
 * "neredeyse aynı" bir yeşille çıkar, kimse fark etmez. Test kopyaların eşit
 * kaldığını sabitliyor.
 */
const css = readFileSync(join(__dirname, 'globals.css'), 'utf8');

function tokens(selector: string): Record<string, string> {
  const blok = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`);
  const m = css.match(blok);
  if (!m) throw new Error(`CSS'te bulunamadı: ${selector}`);
  return Object.fromEntries(
    [...m[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]),
  );
}

/**
 * rgb(255 255 255 / 0.11) ile rgba(255,255,255,0.11) aynı rengi anlatıyor;
 * CSS boşluklu sözdizimini, React Native virgüllüyü istiyor. Karşılaştırma
 * ikisini ortak bir biçime indirger.
 */
function normalize(v: string): string {
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (!m) return v.trim().toLowerCase();
  const parcalar = m[1].split(/[\s,/]+/).filter(Boolean);
  return `rgba(${parcalar.join(',')})`;
}

describe('tasarım tokenları web CSS ile aynı', () => {
  it('vurgu renkleri', () => {
    const t = tokens(':root');
    expect(t['route']).toBe(accent.route);
    expect(t['route-hover']).toBe(accent.routeHover);
    expect(t['route-ink']).toBe(accent.routeInk);
    expect(t['route-soft']).toBe(accent.routeSoft);
    expect(t['route-deep']).toBe(accent.routeDeep);
    expect(t['blue']).toBe(accent.blue);
    expect(t['warning']).toBe(accent.warning);
    expect(t['success']).toBe(accent.success);
  });

  it('açık tema', () => {
    const t = tokens('.theme-cream');
    expect(t['bg']).toBe(cream.bg);
    expect(t['surface']).toBe(cream.surface);
    expect(t['surface-2']).toBe(cream.surface2);
    expect(t['ink']).toBe(cream.ink);
    expect(t['muted']).toBe(cream.muted);
    expect(t['line']).toBe(cream.line);
  });

  it('koyu tema', () => {
    const t = tokens('.theme-dark');
    expect(t['bg']).toBe(dark.bg);
    expect(t['surface']).toBe(dark.surface);
    expect(t['surface-2']).toBe(dark.surface2);
    expect(t['ink']).toBe(dark.ink);
    expect(t['muted']).toBe(dark.muted);
    expect(normalize(t['line'])).toBe(normalize(dark.line));
  });
});
