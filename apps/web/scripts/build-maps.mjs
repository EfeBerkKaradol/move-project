#!/usr/bin/env node
/**
 * src/components/hero/geo-data.ts üretir.
 *
 * Hero sahnesindeki haritalar elle çizilmiş silüetler değil, gerçek sınır
 * verisinden türetiliyor:
 *   Türkiye  → geoBoundaries gbOpen TUR ADM0 (OpenStreetMap türevi, CC BY 4.0)
 *   İller    → geoBoundaries gbOpen TUR ADM1 (aynı kaynak, 81 il sınırı)
 *   İstanbul → sahircansurmeli/istanbul-geojson, ilce_geojson.json (OSM / Nominatim)
 *
 * Kaynak dosyalar repoya girmiyor (7 + 9,7 + 2,8 MB); yalnızca sadeleştirilmiş
 * çıktı giriyor. Yeniden üretmek için:
 *   node scripts/build-maps.mjs <TUR-ADM0.geojson> <istanbul-ilce.json> <TUR-ADM1.geojson>
 *
 * Yalnızca il sınırlarını tazelemek için (diğer iki kaynak gerekmeden):
 *   node scripts/build-maps.mjs --provinces-only <TUR-ADM1.geojson>
 *
 * İl il tıklanabilir harita için kapalı poligonlar (src/components/map/province-shapes.ts):
 *   node scripts/build-maps.mjs --province-shapes <TUR-ADM1.geojson>
 *
 * Seçilen ilin içindeki ilçe sınırları (src/components/map/district-shapes.ts):
 *   node scripts/build-maps.mjs --district-shapes <TUR-ADM2.geojson> <TUR-ADM1.geojson>
 *   (ADM2 dosyası ilin adını taşımıyor; ilçe hangi ilin içine düşüyorsa oraya
 *    yazılıyor, adalar en yakın kıyıya.)
 *
 * Bu kipte oturtma, geo-data.ts'e yazılmış TURKEY_PROJECTION'dan okunuyor. Böylece
 * iller aynı uzaya düşüyor ve dosyanın geri kalanına — rotaya, araca, şehir
 * noktalarına — hiç dokunulmuyor. Sadeleştirme kodu tek: iki kip de aynı
 * fonksiyonları kullanıyor.
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
  /**
   * İl sınırlarının sadeleştirme toleransı (mercator birimi).
   *
   * <p>İl başına nokta bütçesi DEĞİL, ortak tolerans: sınırlar yay yay ve tek
   * kez sadeleştiriliyor, bir ilin bütçesi komşusunun sınırını da belirliyor.
   * Ortak bir tolerans, her yayın uzunluğuna göre hak ettiği kadar nokta almasını
   * sağlıyor.
   *
   * Mobilde il sınırı HİÇ çizilmiyor, o yüzden kompakt sürüm yok.
   */
  provinceTolerance: 1.2e-3,
  /**
   * İlçe sınırları. İllerden ince, çünkü yalnızca SEÇİLEN ilin ilçeleri
   * gönderiliyor — bütçe seksen bir ile değil bir ile bölünüyor.
   */
  districtTolerance: 3.5e-4,
};


const [, , turkeyPath, istanbulPath, provincePath] = process.argv;
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
  const project = ([x, y]) => [
    +((x - minX) * scale + offsetX).toFixed(1),
    +((maxY - y) * scale + offsetY).toFixed(1),
  ];
  // Parametreler de dışarı veriliyor: sabit şehirler derleme anında projekte
  // ediliyor ama ilan haritası çalışma anında gelen koordinatları çiziyor.
  project.params = { minX, maxY, scale, offsetX, offsetY };
  return project;
}

const toPath = (rings, project) =>
  rings
    .map((r) => 'M' + r.map(project).map(([x, y]) => `${x} ${y}`).join('L') + 'Z')
    .join('');

const nokta = (p) => `${p[0].toFixed(9)},${p[1].toFixed(9)}`;

/**
 * ADM1 dosyasından sadeleştirilmiş il listesi.
 *
 * <p><strong>Ortak sınır bir kez sadeleştiriliyor.</strong> Her il ayrı ayrı
 * sadeleştirildiğinde komşu iki ilin paylaştığı sınır iki farklı nokta kümesine
 * düşüyor: çizgiler birbirinden bir iki piksel kayıyor, üst üste binen iki yarı
 * saydam çizgi koyulaşıyor ve sınırlar bulanıklaşıyor. Kaynakta komşular birebir
 * aynı noktaları paylaşıyor (~%19'u), bu yüzden sınırı yaylara ayırıp her yayı
 * TEK kez sadeleştirmek mümkün: iki il de aynı çizgiyi alıyor, üst üste binen
 * çizgiler tam örtüşüyor.
 *
 * <p>Bu, TopoJSON'un yaptığı işin küçük bir hâli. Kütüphane eklemek yerine
 * yazıldı çünkü ihtiyaç tek bir dosyaya özel ve otuz satır tutuyor.
 */
function readProvinces(file) {
  return readAreas(file, 81);
}

/**
 * Aynı yay topolojisi il ve ilçe için. Tek fark beklenen sayı ve tolerans;
 * ikisini de kopyalamak, birinde düzeltilen bir hatayı diğerinde bırakırdı.
 */
function readAreas(file, beklenen, tolerans = TARGET.provinceTolerance) {
  const geo = JSON.parse(readFileSync(file, 'utf8'));
  const iller = geo.features
    .map((f) => ({ name: f.properties.shapeName ?? '', rings: ringsOf(f.geometry) }))
    .map((p) => {
      // İl içindeki adacıklar sınır çiziminde nokta kalabalığından başka bir şey
      // üretmiyor; ana gövde kalıyor
      const largest = Math.max(...p.rings.map(area));
      return { name: p.name, rings: p.rings.filter((r) => area(r) > largest / 120) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  if (iller.length !== beklenen) throw new Error(`Alan sayısı ${beklenen} olmalı, ${iller.length} bulundu.`);

  // 1) Her nokta kaç ilde geçiyor? Birden çoksa o nokta bir ortak sınırın üstünde.
  const sahip = new Map();
  iller.forEach((il, i) => {
    const gorulen = new Set();
    for (const ring of il.rings) for (const p of ring) {
      const k = nokta(p);
      if (gorulen.has(k)) continue;
      gorulen.add(k);
      (sahip.get(k) ?? sahip.set(k, new Set()).get(k)).add(i);
    }
  });
  const sahipAnahtari = (p) => [...(sahip.get(nokta(p)) ?? [])].sort((a, b) => a - b).join('-');

  // 2) Halkaları yaylara böl: sahip kümesi değiştiği her yerde kesiliyor.
  //    Aynı ortak sınır iki ilde de aynı yay olarak çıkıyor (biri ters yönde).
  const yaylar = new Map();
  const kanonik = (yay) => {
    const ileri = yay.map(nokta).join('|');
    const geri = [...yay].reverse().map(nokta).join('|');
    return ileri < geri ? ileri : geri;
  };

  const halkaYaylari = iller.map((il) =>
    il.rings.map((ring) => {
      // Kapalı halka: son nokta ilkin tekrarı, bölerken bir kez sayılıyor
      const pts = ring.slice(0, -1);
      const anahtarlar = pts.map(sahipAnahtari);
      const kesim = [];
      for (let i = 0; i < pts.length; i++) {
        if (anahtarlar[i] !== anahtarlar[(i - 1 + pts.length) % pts.length]) kesim.push(i);
      }
      // Hiç değişmiyorsa (ada ya da tamamen ortak sınır) halkanın kendisi tek yay
      if (kesim.length === 0) kesim.push(0);

      const parcalar = [];
      for (let c = 0; c < kesim.length; c++) {
        const bas = kesim[c];
        const son = kesim[(c + 1) % kesim.length];
        const yay = [];
        for (let i = bas; ; i = (i + 1) % pts.length) {
          yay.push(pts[i]);
          if (i === son) break;
        }
        if (yay.length >= 2) parcalar.push(yay);
      }
      return parcalar;
    }),
  );

  // 3) Her benzersiz yayı BİR kez sadeleştir
  for (const il of halkaYaylari) for (const ring of il) for (const yay of ring) {
    const k = kanonik(yay);
    if (!yaylar.has(k)) yaylar.set(k, simplify(yay, tolerans));
  }

  // 4) İÇ sınırlar: ≥2 ilin paylaştığı yaylar, her biri BİR kez.
  //    Kıyı buraya girmiyor — o zaten ülke silüetinden çiziliyor; iki katmanın
  //    ayrı sadeleştirilmiş kıyıyı üst üste basması bulanıklık üretirdi.
  const icSinirlar = [];
  const yazilan = new Set();
  for (const il of halkaYaylari) for (const ring of il) for (const yay of ring) {
    const k = kanonik(yay);
    if (yazilan.has(k)) continue;
    yazilan.add(k);
    // Yayın her noktası ≥2 ilde geçiyorsa bu bir iç sınır
    const ortak = yay.every((pt) => (sahip.get(nokta(pt))?.size ?? 0) > 1);
    if (ortak) icSinirlar.push(yaylar.get(k));
  }

  const provinces = iller.map((il, i) => ({
    name: il.name,
    rings: kalanHalkalar(il, halkaYaylari[i]),
  }));

  /**
   * Sadeleştirilmiş halkalar; hepsi eriyip gitmişse ham hâli.
   *
   * <p>Çok küçük bir alan (bir ilçe kadar) ortak toleransta dört noktanın
   * altına inebiliyor ve elenip yok oluyordu. Sessizce düşürmek, haritada
   * sebepsiz bir delik bırakır — küçük olan da bir yer.
   */
  function kalanHalkalar(alan, ringYaylari) {
    const sade = ringYaylari.map((ring) => {
      const pts = [];
      for (const yay of ring) {
        const sade = yaylar.get(kanonik(yay));
        // Kanonik anahtar yönü kaybediyor; yay ters saklanmışsa geri çevriliyor
        const duz = nokta(sade[0]) === nokta(yay[0]) ? sade : [...sade].reverse();
        for (const p of duz) {
          if (pts.length === 0 || nokta(pts[pts.length - 1]) !== nokta(p)) pts.push(p);
        }
      }
      if (pts.length) pts.push(pts[0]);
      return pts;
    }).filter((r) => r.length >= 4);

    if (sade.length > 0) return sade;
    const enBuyuk = alan.rings.reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a));
    return [enBuyuk];
  }

  return { provinces, icSinirlar };
}

/** İç sınırlar tek bir yol katarında; her yay kapalı değil, açık çizgi. */
const bordersBlock = (arcs, project) =>
  `export const TURKEY_BORDERS =\n  '${arcs
    .map((a) => 'M' + a.map(project).map(([x, y]) => `${x} ${y}`).join('L'))
    .join('')}';`;

// ── Yalnızca iller ────────────────────────────────────────────────────────
if (process.argv[2] === '--provinces-only') {
  const file = process.argv[3];
  if (!file) throw new Error('kullanım: node scripts/build-maps.mjs --provinces-only <TUR-ADM1.geojson>');

  const target = new URL('../src/components/hero/geo-data.ts', import.meta.url);
  const current = readFileSync(target, 'utf8');

  // Oturtma dosyanın kendisinden okunuyor: elle kopyalanan bir sabit, kaynak
  // güncellendiğinde sessizce eskir ve iller haritadan kayar
  const params = Object.fromEntries(
    ['minX', 'maxY', 'scale', 'offsetX', 'offsetY'].map((key) => {
      const m = current.match(new RegExp(`${key}:\\s*(-?[\\d.]+)`));
      if (!m) throw new Error(`TURKEY_PROJECTION.${key} geo-data.ts içinde bulunamadı.`);
      return [key, Number(m[1])];
    }),
  );
  const project = ([x, y]) => [
    +((x - params.minX) * params.scale + params.offsetX).toFixed(1),
    +((params.maxY - y) * params.scale + params.offsetY).toFixed(1),
  ];

  // ringsOf mercator'ı zaten uyguluyor; burada ikinci kez uygulamak noktaları
  // kutunun bin piksel dışına atıyordu
  const { icSinirlar } = readProvinces(file);
  const block = bordersBlock(icSinirlar, project);
  const replaced = current.replace(/export const TURKEY_BORDERS =\n  '[^']*';/, block);
  if (replaced === current) throw new Error('TURKEY_BORDERS bloğu geo-data.ts içinde bulunamadı.');
  writeFileSync(target, replaced);
  console.log(`TURKEY_BORDERS güncellendi (${icSinirlar.length} iç sınır yayı).`);
  process.exit(0);
}

/** Halkanın alan ağırlıklı ağırlık merkezi — etiket ve yakınlaştırma noktası. */
function centroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  if (a === 0) return ring[0];
  return [cx / (3 * a), cy / (3 * a)];
}

/** Işın atma: nokta halkanın içinde mi. */
function halkaIcinde(ring, [px, py]) {
  let icinde = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) icinde = !icinde;
  }
  return icinde;
}

/** SVG yolu: kapalı halkalar. */
const yolKatari = (halkalar) =>
  halkalar.map((r) => 'M' + r.map(([x, y]) => `${x} ${y}`).join('L') + 'Z').join('');

/**
 * geo-data.ts'e yazılmış oturtmayı okur.
 *
 * <p>Elle kopyalanan bir sabit, kaynak tazelendiğinde sessizce eskir ve
 * katmanlar birbirinden kayar.
 */
function projeksiyonuOku() {
  const geoData = readFileSync(new URL('../src/components/hero/geo-data.ts', import.meta.url), 'utf8');
  const params = Object.fromEntries(
    ['minX', 'maxY', 'scale', 'offsetX', 'offsetY'].map((key) => {
      const m = geoData.match(new RegExp(`${key}:\\s*(-?[\\d.]+)`));
      if (!m) throw new Error(`TURKEY_PROJECTION.${key} geo-data.ts içinde bulunamadı.`);
      return [key, Number(m[1])];
    }),
  );
  return ([x, y]) => [
    +((x - params.minX) * params.scale + params.offsetX).toFixed(1),
    +((params.maxY - y) * params.scale + params.offsetY).toFixed(1),
  ];
}

// ── İlçe şekilleri ────────────────────────────────────────────────────────
//
// Seçilen il yakınlaştığında içi boş kalıyordu. İlçe sınırları, ilanların
// gerçek çözünürlüğü: adres toplanmıyor (ADR-0008), ilan "Beşiktaş" düzeyinde
// duruyor. Sokak çizmek, bilmediğimiz bir hassasiyeti biliyormuş gibi
// göstermek olurdu.
if (process.argv[2] === '--district-shapes') {
  const [, , , adm2, adm1] = process.argv;
  if (!adm2 || !adm1) {
    throw new Error('kullanım: node scripts/build-maps.mjs --district-shapes <TUR-ADM2.geojson> <TUR-ADM1.geojson>');
  }

  const project = projeksiyonuOku();
  const { provinces } = readProvinces(adm1);
  const { provinces: ilceler } = readAreas(adm2, 973, TARGET.districtTolerance);

  /**
   * Kaynaktaki İngilizce ve eksik yazımlar.
   *
   * <p>Veri seti Türkiye ilçelerinin üçünü yabancı adıyla veriyor. Kullanıcıya
   * "Prince Islands" göstermek, ilanın "Adalar" yazan ilçesiyle eşleşmiyor.
   */
  const AD_DUZELTME = {
    'Prince Islands': 'Adalar',
    Imbros: 'Gökçeada',
    Ulukisla: 'Ulukışla',
  };

  // ADM2 dosyası ilin adını taşımıyor; ilçe hangi ilin sınırının içine
  // düşüyorsa oraya yazılıyor. Merkez içeride değilse (girintili ilçe ya da
  // ada) halkanın diğer noktaları deneniyor, o da olmazsa EN YAKIN SINIR.
  //
  // En yakın il MERKEZİ denendi ve adaları yanlış ile yazdı: Adalar Yalova'ya,
  // Marmara Adası Tekirdağ'a düştü. Ada karşı kıyıya değil, en yakın kıyıya
  // aittir — ölçülmesi gereken sınıra olan uzaklık.
  const ilinIlceleri = new Map(provinces.map((il) => [il.name, []]));
  let tahminle = 0;

  const sinirUzakligi = (il, [px, py]) => {
    let enYakin = Infinity;
    for (const ring of il.rings) {
      for (const [x, y] of ring) {
        const d = (x - px) ** 2 + (y - py) ** 2;
        if (d < enYakin) enYakin = d;
      }
    }
    return enYakin;
  };

  for (const ilce of ilceler) {
    const anaHalka = ilce.rings.reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a));
    const adaylar = [centroid(anaHalka), ...anaHalka.filter((_, i) => i % 7 === 0)];

    let sahip = null;
    for (const nokta of adaylar) {
      sahip = provinces.find((il) => il.rings.some((r) => halkaIcinde(r, nokta)));
      if (sahip) break;
    }
    if (!sahip) {
      tahminle++;
      const m = centroid(anaHalka);
      sahip = provinces.reduce((a, b) => (sinirUzakligi(b, m) < sinirUzakligi(a, m) ? b : a));
    }

    ilinIlceleri.get(sahip.name).push({
      name: AD_DUZELTME[ilce.name] ?? ilce.name,
      d: yolKatari(ilce.rings.map((r) => r.map(project))),
    });
  }

  const bos = [...ilinIlceleri].filter(([, v]) => v.length === 0).map(([k]) => k);
  if (bos.length) throw new Error(`İlçesi olmayan il: ${bos.join(', ')}`);

  const govde = [...ilinIlceleri]
    .map(([il, list]) => {
      const satirlar = list
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
        .map((d) => `    { name: ${JSON.stringify(d.name)}, d: '${d.d}' },`)
        .join('\n');
      return `  ${JSON.stringify(il)}: [\n${satirlar}\n  ],`;
    })
    .join('\n');

  const out = `// ÜRETİLMİŞ DOSYA — elle düzenlenmiyor.
// node scripts/build-maps.mjs --district-shapes <TUR-ADM2.geojson> <TUR-ADM1.geojson>
//
// Kaynak: geoBoundaries gbOpen TUR ADM2 (OpenStreetMap türevi).
// Oturtma il haritasıyla ortak (geo-data.ts · TURKEY_PROJECTION).
//
// SUNUCUDA kalıyor: sayfa yalnızca SEÇİLİ ilin ilçelerini istemciye gönderiyor.
// Tamamı gönderilseydi her ziyaretçi seksen bir ilin ilçesini indirirdi.

export type DistrictShape = { name: string; d: string };

export const DISTRICTS_BY_PROVINCE: Record<string, DistrictShape[]> = {
${govde}
};
`;

  const hedef = new URL('../src/components/map/district-shapes.ts', import.meta.url);
  writeFileSync(hedef, out);
  const nokta = [...ilinIlceleri.values()].flat().reduce((t, d) => t + (d.d.match(/[ML]/g) ?? []).length, 0);
  console.log(
    `district-shapes.ts yazıldı — ${ilceler.length} ilçe, ${nokta} nokta, ${(out.length / 1024).toFixed(0)} KB` +
    (tahminle ? ` (${tahminle} ilçe en yakın ile atandı)` : ''),
  );
  process.exit(0);
}

// ── İl şekilleri ──────────────────────────────────────────────────────────
//
// TURKEY_BORDERS yalnızca sınır ÇİZGİLERİ; tıklanabilir bir harita için ilin
// kapalı poligonu gerekiyor. Aynı yay topolojisinden üretiliyor: komşuların
// paylaştığı sınır tek kez sadeleştirildiği için iki ilin çizgisi birebir
// örtüşüyor, aralarında ne boşluk ne de çift çizgi kalıyor.
if (process.argv[2] === '--province-shapes') {
  const file = process.argv[3];
  if (!file) throw new Error('kullanım: node scripts/build-maps.mjs --province-shapes <TUR-ADM1.geojson>');

  const project = projeksiyonuOku();
  const { provinces } = readProvinces(file);

  const kayitlar = provinces.map((il) => {
    const halkalar = il.rings.map((r) => r.map(project));
    const d = halkalar
      .map((r) => 'M' + r.map(([x, y]) => `${x} ${y}`).join('L') + 'Z')
      .join('');

    const hepsi = halkalar.flat();
    const xs = hepsi.map(([x]) => x);
    const ys = hepsi.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    // Ağırlık merkezi en büyük halkadan: adacıklar merkezi denize kaydırıyordu
    const anaHalka = halkalar.reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a));
    const [cx, cy] = centroid(anaHalka);

    return {
      name: il.name,
      d,
      cx: +cx.toFixed(1),
      cy: +cy.toFixed(1),
      box: [minX, minY, +(maxX - minX).toFixed(1), +(maxY - minY).toFixed(1)],
    };
  });

  const nokta = kayitlar.reduce((t, k) => t + (k.d.match(/[ML]/g) ?? []).length, 0);
  const govde = kayitlar
    .map((k) => `  { name: ${JSON.stringify(k.name)}, cx: ${k.cx}, cy: ${k.cy}, ` +
      `box: [${k.box.join(', ')}], d: '${k.d}' },`)
    .join('\n');

  const out = `// ÜRETİLMİŞ DOSYA — elle düzenlenmiyor.
// node scripts/build-maps.mjs --province-shapes <TUR-ADM1.geojson>
//
// Kaynak: geoBoundaries gbOpen TUR ADM1 (OpenStreetMap türevi).
// Oturtma hero haritasıyla ortak (geo-data.ts · TURKEY_PROJECTION), bu yüzden
// iki harita aynı kutuya ve aynı ölçeğe düşüyor.

/** Bir ilin kapalı sınırı ve yakınlaştırma bilgileri. */
export type ProvinceShape = {
  /** geoBoundaries yazımı; API'deki il adıyla eşlemek için normalize edilmeli
   *  (kaynak "Hakkâri" diyor, veritabanı "Hakkari"). */
  name: string;
  /** Etiket ve yakınlaştırma merkezi. */
  cx: number;
  cy: number;
  /** Sığdırma kutusu: [x, y, genişlik, yükseklik]. */
  box: [number, number, number, number];
  /** Kapalı yol; komşuyla ortak sınır aynı noktalardan geçiyor. */
  d: string;
};

export const PROVINCE_SHAPES: ProvinceShape[] = [
${govde}
];
`;

  const hedef = new URL('../src/components/map/province-shapes.ts', import.meta.url);
  writeFileSync(hedef, out);
  console.log(`province-shapes.ts yazıldı — ${kayitlar.length} il, ${nokta} nokta, ${(out.length / 1024).toFixed(1)} KB.`);
  process.exit(0);
}

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

// ── İller ─────────────────────────────────────────────────────────────────
// Oturtma (fitTurkey) BİLEREK dış hattan hesaplanıyor, illerden değil: iller
// birleşimi ülkeyle aynı sınırı verse de sadeleştirme sonrası birkaç ondalık
// farkla çıkar ve projeksiyon kayar. Kayınca rota, araç ve şehir noktaları
// yerinden oynar — geo-data.test.ts tam bunu koruyor.
const provinceData = provincePath ? readProvinces(provincePath) : { icSinirlar: [] };

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
 * Büyükşehirler. Rotaya dahil değiller ama haritada okunuyorlar: etiketli,
 * belirgin düğümler.
 */
const NETWORK_MAJOR = [
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
 * Kalan iller. Etiketsiz ve çok soluk noktalar.
 *
 * <p>Yalnızca büyükşehirleri koymak haritayı on sekiz noktalık bir şemaya
 * indiriyordu; "81 il" iddiası ile ekranda görünen şey uyuşmuyordu. Bunlar
 * kapsamı gösteriyor, okunmak için değil arka planda doku olmak için varlar —
 * parlarlarsa rotayı ve büyükşehirleri bastırırlar.
 */
const NETWORK_MINOR = [
  ['Adıyaman', 38.28, 37.76], ['Afyonkarahisar', 30.54, 38.76], ['Ağrı', 43.05, 39.72],
  ['Aksaray', 34.03, 38.37], ['Amasya', 35.83, 40.65], ['Ardahan', 42.70, 41.11],
  ['Artvin', 41.82, 41.18], ['Aydın', 27.85, 37.85], ['Bartın', 32.34, 41.64],
  ['Batman', 41.13, 37.89], ['Bayburt', 40.23, 40.26], ['Bilecik', 29.98, 40.14],
  ['Bingöl', 40.50, 38.88], ['Bitlis', 42.11, 38.40], ['Bolu', 31.61, 40.74],
  ['Burdur', 30.29, 37.72], ['Çanakkale', 26.41, 40.15], ['Çankırı', 33.62, 40.60],
  ['Çorum', 34.95, 40.55], ['Düzce', 31.16, 40.84], ['Edirne', 26.56, 41.68],
  ['Elazığ', 39.22, 38.68], ['Erzincan', 39.49, 39.75], ['Giresun', 38.39, 40.91],
  ['Gümüşhane', 39.48, 40.46], ['Hakkari', 43.74, 37.58], ['Hatay', 36.16, 36.20],
  ['Iğdır', 44.04, 39.92], ['Isparta', 30.55, 37.77], ['Kahramanmaraş', 36.94, 37.58],
  ['Karabük', 32.62, 41.20], ['Karaman', 33.22, 37.18], ['Kars', 43.10, 40.60],
  ['Kastamonu', 33.78, 41.38], ['Kilis', 37.12, 36.72], ['Kırıkkale', 33.51, 39.85],
  ['Kırklareli', 27.22, 41.74], ['Kırşehir', 34.16, 39.15], ['Kocaeli', 29.92, 40.77],
  ['Kütahya', 29.98, 39.42], ['Manisa', 27.43, 38.62], ['Mardin', 40.74, 37.31],
  ['Muğla', 28.36, 37.22], ['Muş', 41.75, 38.73], ['Nevşehir', 34.71, 38.62],
  ['Niğde', 34.68, 37.97], ['Ordu', 37.88, 40.98], ['Osmaniye', 36.25, 37.07],
  ['Rize', 40.52, 41.02], ['Sakarya', 30.40, 40.78], ['Siirt', 41.94, 37.93],
  ['Sinop', 35.15, 42.03], ['Şırnak', 42.46, 37.52], ['Tekirdağ', 27.51, 40.98],
  ['Tokat', 36.55, 40.31], ['Tunceli', 39.54, 39.11], ['Uşak', 29.41, 38.68],
  ['Yalova', 29.28, 40.65], ['Yozgat', 34.81, 39.82], ['Zonguldak', 31.79, 41.45],
];

// Harita "81 il" diyor; listeler eksik kalırsa iddia ile ekran ayrışır.
const ilSayisi = CITIES.length + NETWORK_MAJOR.length + NETWORK_MINOR.length;
if (ilSayisi !== 81) {
  throw new Error(`İl listesi eksik ya da fazla: ${ilSayisi} il var, 81 olmalı.`);
}

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
const network = [
  ...NETWORK_MAJOR.map(([label, lon, lat]) => ({ label, lon, lat, major: true })),
  ...NETWORK_MINOR.map(([label, lon, lat]) => ({ label, lon, lat, major: false })),
].map(({ label, lon, lat, major }) => {
  const [x, y] = project2(fitTurkey)([lon, lat]);
  return { label, x, y, major };
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

/**
 * İl sınırları — 81 il.
 *
 * Yalnızca geniş ekranda çiziliyor. Telefonda harita 375 piksel geniş; il başına
 * ~10 piksel düşüyor ve sınırlar okunmuyor, yalnızca maliyet çıkarıyor. Orada
 * TURKEY_PATH_COMPACT'in tek silüeti kalıyor.
 */
${bordersBlock(provinceData.icSinirlar, fitTurkey)}

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

/**
 * Rota dışı iller. {@code major} olanlar etiketli ve belirgin; kalanlar kapsamı
 * gösteren soluk noktalar.
 */
export const NETWORK_CITIES: { label: string; x: number; y: number; major: boolean }[] =
  ${JSON.stringify(network, null, 2).replace(/"([a-z]+)":/g, '$1:')};

export const ISTANBUL_NODES: MapNode[] = ${JSON.stringify(istanbulNodes, null, 2).replace(/"([a-z]+)":/g, '$1:')};

/** Avrupa yakası → Boğaz → Anadolu yakası → şehirlerarası çıkış. */
export const ROUTE_CITY = '${smoothPath(cityRoute)}';

/** Şehirlerarası bacaklar. */
export const ROUTE_OUT = '${arc(findCity('istanbul'), findCity('ankara'), 0.1)}';
export const ROUTE_BACK = '${arc(findCity('ankara'), findCity('izmir'), 0.12)}';

/**
 * Türkiye haritasının projeksiyon parametreleri.
 *
 * <p>Sabit şehirler derleme anında projekte ediliyor; ilan haritası ise çalışma
 * anında gelen ilçe koordinatlarını çiziyor. İkisinin aynı uzayda olması için
 * dönüşüm burada da açık duruyor.
 */
export const TURKEY_PROJECTION = {
  minX: ${fitTurkey.params.minX},
  maxY: ${fitTurkey.params.maxY},
  scale: ${fitTurkey.params.scale},
  offsetX: ${fitTurkey.params.offsetX},
  offsetY: ${fitTurkey.params.offsetY},
} as const;

/** Coğrafi koordinatı harita kutusuna taşır (Web Mercator + yukarıdaki oturtma). */
export function projectLonLat(lon: number, lat: number): { x: number; y: number } {
  const mx = (lon * Math.PI) / 180;
  const my = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const p = TURKEY_PROJECTION;
  return {
    x: +((mx - p.minX) * p.scale + p.offsetX).toFixed(1),
    y: +((p.maxY - my) * p.scale + p.offsetY).toFixed(1),
  };
}

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
