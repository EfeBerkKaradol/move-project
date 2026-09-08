#!/usr/bin/env node
/**
 * src/components/hero/geo-data.ts üretir.
 *
 * Hero sahnesindeki haritalar elle çizilmiş silüetler değil, gerçek sınır
 * verisinden türetiliyor:
 *   Türkiye  → geoBoundaries gbOpen TUR ADM0 (OpenStreetMap türevi, CC BY 4.0)
 *   İstanbul → sahircansurmeli/istanbul-geojson, ilce_geojson.json (OSM / Nominatim)
 *
 * Kaynak dosyalar repoya girmiyor (7 MB + 2,8 MB); yalnızca sadeleştirilmiş
 * çıktı giriyor. Yeniden üretmek için:
 *   node scripts/build-maps.mjs <TUR-ADM0.geojson> <istanbul-ilce.json>
 *
 * İki harita AYNI en-boy oranlı kutuya oturtuluyor. Aracın konumu kutu içindeki
 * yüzdeyle veriliyor; oranlar farklı olsaydı `preserveAspectRatio` her haritada
 * başka bir kutu bırakır ve araç haritadan kayardı.
 */
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Ortak kutu. İstanbul ~1.9:1, Türkiye ~2.35:1 — tek kutu ikisine birden tam
 * oturmuyor. 2.13 ikisinin arası: her iki harita da kutunun %89'undan fazlasını
 * dolduruyor, hiçbiri kadrajda kaybolmuyor.
 */
const BOX = { w: 1000, h: 470 };
/**
 * Sadeleştirme, nokta sayısı hedefe inene kadar toleransı büyüterek çalışır.
 *
 * <p>İki ayrı bütçe: masaüstünde kıyı çizgisinin karakteri görünüyor, telefonda
 * 375 px genişlikte görünmüyor ama boyama maliyeti aynı kalıyor. Mobil sürüm
 * belirgin biçimde daha kaba — fark gözle seçilmiyor, kare süresi seçiliyor.
 */
const TARGET = {
  turkey: 620,
  turkeyCompact: 240,
  istanbulPerDistrict: 30,
  istanbulPerDistrictCompact: 16,
};


const [, , turkeyPath, istanbulPath] = process.argv;
if (!turkeyPath || !istanbulPath) {
  console.error('kullanım: node scripts/build-maps.mjs <TUR-ADM0.geojson> <istanbul-ilce.json>');
  process.exit(1);
}

/** Web Mercator — küçük alanda da ülke ölçeğinde de biçimi bozmuyor. */
function mercator([lon, lat]) {
  return [(lon * Math.PI) / 180, Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))];
}

/** Douglas–Peucker. Kıyı çizgisinin karakterini korur, ara noktaları atar. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop();
    let index = -1;
    let maxDistance = 0;
    const [x1, y1] = points[first];
    const [x2, y2] = points[last];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i];
      // Noktanın doğru parçasına dik uzaklığı
      const t = lengthSquared === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
      const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x1 + clamped * dx - px;
      const ey = y1 + clamped * dy - py;
      const distance = ex * ex + ey * ey;
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (maxDistance > tolerance * tolerance && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Hedef nokta sayısına inene kadar toleransı ikiye katlar. */
function simplifyToBudget(rings, budget, start = 1e-5) {
  let tolerance = start;
  let out = rings;
  for (let i = 0; i < 40; i++) {
    out = rings.map((r) => simplify(r, tolerance)).filter((r) => r.length >= 4);
    if (out.reduce((n, r) => n + r.length, 0) <= budget) break;
    tolerance *= 1.6;
  }
  return out;
}

function ringsOf(geometry) {
  const polys =
    geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  // Yalnızca dış halkalar: iç boşluklar (göller) bu ölçekte görünmüyor
  return polys.map((p) => p[0].map(mercator));
}

/** Halka alanı — küçük adaları elemek için. */
const area = (ring) => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
};

/** Mercator koordinatlarını sabit kutuya ortalayarak oturtur. */
function fitter(rings) {
  const xs = rings.flat().map((p) => p[0]);
  const ys = rings.flat().map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 0.03;
  const scale = Math.min(
    (BOX.w * (1 - pad * 2)) / (maxX - minX),
    (BOX.h * (1 - pad * 2)) / (maxY - minY),
  );
  const offsetX = (BOX.w - (maxX - minX) * scale) / 2;
  const offsetY = (BOX.h - (maxY - minY) * scale) / 2;
  // Mercator y yukarı artar, SVG y aşağı artar
  return ([x, y]) => [
    +((x - minX) * scale + offsetX).toFixed(1),
    +((maxY - y) * scale + offsetY).toFixed(1),
  ];
}

const toPath = (rings, project) =>
  rings
    .map((r) => 'M' + r.map(project).map(([x, y]) => `${x} ${y}`).join('L') + 'Z')
    .join('');

// ── Türkiye ───────────────────────────────────────────────────────────────
const turkeyGeo = JSON.parse(readFileSync(turkeyPath, 'utf8'));
let turkeyRings = ringsOf(turkeyGeo.features[0].geometry);
const biggest = Math.max(...turkeyRings.map(area));
// Ada kalabalığı editoryal bir haritada gürültü; anakara ve Marmara adaları kalıyor
turkeyRings = turkeyRings.filter((r) => area(r) > biggest / 900);
const turkeyRingsCompact = simplifyToBudget(turkeyRings, TARGET.turkeyCompact);
turkeyRings = simplifyToBudget(turkeyRings, TARGET.turkey);
// Ölçekleme her iki sürüm için de aynı olmalı: mobil ve masaüstü aynı kutuya
// oturmazsa araç sahne değişince kayar
const fitTurkey = fitter(turkeyRings);

// ── İstanbul ──────────────────────────────────────────────────────────────
const istanbulGeo = JSON.parse(readFileSync(istanbulPath, 'utf8'));
const districts = istanbulGeo.features.map((f) => ({
  name: (f.properties.display_name ?? '').split(',')[0],
  rings: ringsOf(f.geometry),
}));
for (const d of districts) {
  const largest = Math.max(...d.rings.map(area));
  d.rings = simplifyToBudget(
    d.rings.filter((r) => area(r) > largest / 60),
    TARGET.istanbulPerDistrict * Math.max(1, d.rings.length > 3 ? 2 : 1),
  );
}
const fitIstanbul = fitter(districts.flatMap((d) => d.rings));

// Bütün ilçeler mobilde de çiziliyor: biri atlanırsa kıyı çizgisinde delik kalır.
// Kazanç ilçe sayısından değil, ilçe başına nokta sayısından geliyor.
const districtsCompact = districts.map((d) => ({
  rings: simplifyToBudget(d.rings, TARGET.istanbulPerDistrictCompact, 1e-4),
}));

// ── Noktalar ──────────────────────────────────────────────────────────────
/** Rotanın üzerindeki şehirler — etiketli, kaydırmayla sırayla aktifleşiyor. */
const CITIES = [
  ['istanbul', 'İstanbul', 28.98, 41.01],
  ['ankara', 'Ankara', 32.85, 39.93],
  ['izmir', 'İzmir', 27.14, 38.42],
];

/**
 * Ağın geri kalanı. Rotaya dahil değiller; haritanın Türkiye olduğunu ve
 * kapsamın 81 il olduğunu gösteren küçük düğümler.
 */
const NETWORK = [
  ['Bursa', 29.06, 40.19],
  ['Balıkesir', 27.89, 39.65],
  ['Eskişehir', 30.52, 39.78],
  ['Denizli', 29.09, 37.78],
  ['Antalya', 30.71, 36.88],
  ['Konya', 32.48, 37.87],
  ['Mersin', 34.64, 36.81],
  ['Adana', 35.32, 37.0],
  ['Kayseri', 35.49, 38.73],
  ['Samsun', 36.33, 41.29],
  ['Sivas', 37.02, 39.75],
  ['Gaziantep', 37.38, 37.07],
  ['Şanlıurfa', 38.79, 37.16],
  ['Malatya', 38.31, 38.35],
  ['Trabzon', 39.72, 41.0],
  ['Diyarbakır', 40.23, 37.91],
  ['Erzurum', 41.27, 39.9],
  ['Van', 43.38, 38.49],
];

/**
 * İstanbul içindeki rota: Avrupa yakasından çıkıp Boğaz'ı geçip Anadolu
 * yakasına, oradan da şehirlerarası çıkışa. Ara noktalar gerçek yerler.
 */
const CITY_ROUTE = [
  [28.79, 41.11], // Hadımköy — yükleme
  [28.88, 41.07], // Başakşehir
  [28.98, 41.06], // Şişli
  [29.034, 41.045], // Boğaziçi Köprüsü — geçiş
  [29.09, 41.01], // Üsküdar
  [29.24, 40.94], // Kartal
  [29.4, 40.89], // Gebze yönü — şehirlerarası çıkış
];
const BRIDGE_INDEX = 3;

const project2 = (fit) => ([lon, lat]) => fit(mercator([lon, lat]));

const cities = CITIES.map(([id, label, lon, lat]) => {
  const [x, y] = project2(fitTurkey)([lon, lat]);
  return { id, label, x, y };
});
const network = NETWORK.map(([label, lon, lat]) => {
  const [x, y] = project2(fitTurkey)([lon, lat]);
  return { label, x, y };
});
const cityRoute = CITY_ROUTE.map(project2(fitIstanbul));
const istanbulNodes = [
  { id: 'pickup', label: 'Hadımköy', ...xy(cityRoute[0]) },
  { id: 'bridge', label: 'Boğaz geçişi', ...xy(cityRoute[BRIDGE_INDEX]) },
  { id: 'exit', label: 'Gebze yönü', ...xy(cityRoute[cityRoute.length - 1]) },
];
function xy([x, y]) {
  return { x, y };
}

/** Catmull–Rom → kübik bezier: köşeli polyline yerine yol gibi akan bir eğri. */
function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d;
}
const r = (n) => +n.toFixed(1);

const findCity = (id) => cities.find((c) => c.id === id);
const arc = (a, b, bend) => {
  // Şehirlerarası bacaklar hafif yay: düz çizgi rota değil cetvel gibi duruyor
  const mx = (a.x + b.x) / 2 + (b.y - a.y) * bend;
  const my = (a.y + b.y) / 2 - (b.x - a.x) * bend;
  return `M${a.x} ${a.y}Q${r(mx)} ${r(my)} ${b.x} ${b.y}`;
};

const out = `/**
 * ÜRETİLMİŞ DOSYA — elle düzenleme. Üretici: scripts/build-maps.mjs
 *
 * Kaynaklar:
 *   Türkiye  geoBoundaries gbOpen TUR ADM0 (OpenStreetMap türevi, CC BY 4.0)
 *   İstanbul sahircansurmeli/istanbul-geojson — ilce_geojson.json (OSM/Nominatim)
 *
 * Geometri Web Mercator ile projekte edilip Douglas–Peucker ile sadeleştirildi.
 * İki harita da aynı ${BOX.w}×${BOX.h} kutuya oturuyor: araç konumu kutu içindeki
 * yüzdeyle veriliyor, oranlar farklı olsaydı sahne değişince araç kayardı.
 */

export const MAP_BOX = { w: ${BOX.w}, h: ${BOX.h} } as const;
export const MAP_VIEWBOX = '0 0 ${BOX.w} ${BOX.h}';

/** Türkiye kıyı çizgisi — anakara ve büyük adalar. */
export const TURKEY_PATH =
  '${toPath(turkeyRings, fitTurkey)}';

/** Mobil sürüm — aynı kutuya oturur, yalnızca daha az nokta. */
export const TURKEY_PATH_COMPACT =
  '${toPath(turkeyRingsCompact, fitTurkey)}';

/** İstanbul ilçeleri. Kıyı çizgisi ilçelerin dış sınırından, Boğaz aradaki boşluk. */
export const ISTANBUL_PATHS: string[] = [
${districts.map((d) => `  // ${d.name}\n  '${toPath(d.rings, fitIstanbul)}',`).join('\n')}
];

/** Mobil: kabaca sadeleştirilmiş, küçük ilçeler atılmış. Aynı kutuya oturur. */
export const ISTANBUL_PATHS_COMPACT: string[] = [
${districtsCompact.map((d) => `  '${toPath(d.rings, fitIstanbul)}',`).join('\n')}
];

export type MapNode = { id: string; label: string; x: number; y: number };

export const CITIES: MapNode[] = ${JSON.stringify(cities, null, 2).replace(/"([a-z]+)":/g, '$1:')};

/** Rota dışı şehirler — küçük düğüm, ağın kapsamını gösteriyor. */
export const NETWORK_CITIES: { label: string; x: number; y: number }[] =
  ${JSON.stringify(network, null, 2).replace(/"([a-z]+)":/g, '$1:')};

export const ISTANBUL_NODES: MapNode[] = ${JSON.stringify(istanbulNodes, null, 2).replace(/"([a-z]+)":/g, '$1:')};

/** Avrupa yakası → Boğaz → Anadolu yakası → şehirlerarası çıkış. */
export const ROUTE_CITY = '${smoothPath(cityRoute)}';

/** Şehirlerarası bacaklar. */
export const ROUTE_OUT = '${arc(findCity('istanbul'), findCity('ankara'), 0.1)}';
export const ROUTE_BACK = '${arc(findCity('ankara'), findCity('izmir'), 0.12)}';

/** Sahne değişiminde araç bu iki nokta arasında geçiş yapar (kamera geri çekilir). */
export const HANDOVER = {
  from: { x: ${istanbulNodes[2].x}, y: ${istanbulNodes[2].y} },
  to: { x: ${findCity('istanbul').x}, y: ${findCity('istanbul').y} },
} as const;
`;

writeFileSync(new URL('../src/components/hero/geo-data.ts', import.meta.url), out);
const count = (rings) => rings.reduce((n, r) => n + r.length, 0);
const countDistricts = (list) => list.reduce((n, d) => n + count(d.rings), 0);
console.log(
  `Türkiye: ${count(turkeyRings)} nokta (mobil ${count(turkeyRingsCompact)}) · ` +
    `${network.length} ağ şehri · ` +
    `İstanbul: ${districts.length} ilçe / ${countDistricts(districts)} nokta ` +
    `(mobil ${districtsCompact.length} ilçe / ${countDistricts(districtsCompact)} nokta)`,
);
