#!/usr/bin/env node
/**
 * src/data/places.ts üretir.
 *
 * Kaynak: ferhat-mousavi/turkiye-il-ilce-mahalle-koy → turkiye-il-ilce-mahalle-koy.json (MIT)
 *   Biçim: { "İstanbul": { "Beşi̇ktaş": ["Ci̇hannüma Mahallesi̇", ...] } }
 *   (Kardeş dosya turkiye-il-ilce-mahalle.json'da İstanbul YOK; bu yüzden -koy sürümü.)
 *
 * Kaynağın Türkçe harfleri bozuk: büyük harfli özgün veri Türkçe olmayan yerelle
 * küçültülmüş — "I" → "i" (ı kaybolmuş), "İ" → "i̇" (i + birleşen nokta). Ters
 * dönüşüm kayıpsız: "i̇" özgün İ, çıplak "i" özgün I demek. repairCase bunu yapar.
 *
 * Kullanım: node scripts/build-places.mjs <indirilen.json> [İl1,İl2,...]
 * Varsayılan iller: İstanbul, Ankara (açılış illeri; Hatay tarifede var ama
 * tasarım şehirlerarası dediği için henüz eklenmedi).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const [, , input, citiesArg] = process.argv;
if (!input) {
  console.error('kullanım: node scripts/build-places.mjs <json> [İl1,İl2]');
  process.exit(1);
}
const wanted = (citiesArg ?? 'İstanbul,Ankara').split(',').map((s) => s.trim());
const raw = JSON.parse(readFileSync(input, 'utf8'));

const collator = new Intl.Collator('tr-TR');
const lower = (s) => s.toLocaleLowerCase('tr-TR');
const cap = (w) => (w ? w[0].toLocaleUpperCase('tr-TR') + w.slice(1) : w);

/** "Beşi̇ktaş" → "BEŞİKTAŞ" → "Beşiktaş"; "Kinaliada" → "KINALIADA" → "Kınalıada" */
function repairCase(s) {
  const upper = s.normalize('NFD').replace(/i\u0307/g, 'İ').replace(/i/g, 'I').normalize('NFC')
    .toLocaleUpperCase('tr-TR');
  return lower(upper).split(' ').map((w) => w.split('-').map(cap).join('-')).join(' ');
}

/** "CİHANNÜMA MAH." → "Cihannüma"; "ATATÜRK MAHALLESİ" → "Atatürk"; "1. MAH." → "1." (korunur) */
function cleanHood(name) {
  return repairCase(name)
    .replace(/\s+(Mahallesi|Mah\.?|Mh\.?)$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const cities = wanted.map((city) => {
  const key = Object.keys(raw).find((k) => repairCase(k) === city);
  if (!key) {
    throw new Error(`${city} kaynakta yok. İller: ${Object.keys(raw).slice(0, 8).join(', ')}…`);
  }
  const districts = Object.entries(raw[key])
    .map(([district, hoods]) => {
      const clean = [...new Set(hoods.map(cleanHood))].filter(Boolean).sort(collator.compare);
      return [repairCase(district), clean];
    })
    .sort((a, b) => collator.compare(a[0], b[0]));
  return { city, districts };
});

const total = cities.reduce((n, c) => n + c.districts.reduce((m, d) => m + d[1].length, 0), 0);
const header = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/places.ts'),
  'utf8',
).split('export const PLACES')[0];

const body =
  'export const PLACES: CityPlaces[] = ' +
  JSON.stringify(cities, null, 2).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'") +
  ';\n';

writeFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/places.ts'), header + body);
console.log(
  `${cities.map((c) => `${c.city}: ${c.districts.length} ilçe`).join(', ')} · toplam ${total} mahalle`,
);
