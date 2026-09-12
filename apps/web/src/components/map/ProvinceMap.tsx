'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAP_BOX, MAP_VIEWBOX } from '@/components/hero/geo-data';
import { normalize } from '@/lib/places';
import type { DistrictShape } from './district-shapes';
import { PROVINCE_SHAPES } from './province-shapes';

/**
 * Süzgeç bağlantısı. İki sayfa da aynı kuralı kullanıyor: seçim `il` ve `ilce`
 * parametrelerinde, araç süzgeci korunuyor, seçiliye tekrar basmak temizliyor.
 */
export function suzgecHref(
  basePath: string,
  vehicleFilter: string,
  cityCode: string | null,
  district: string | null = null,
): string {
  const q = new URLSearchParams();
  if (vehicleFilter) q.set('arac', vehicleFilter);
  if (cityCode) q.set('il', cityCode);
  // İlçe ilsiz anlamsız: aynı ad birden çok ilde geçiyor (Merkez, Çayırova…)
  if (cityCode && district) q.set('ilce', district);
  const s = q.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/**
 * Bir ilanın haritadaki izi. Noktalar sunucuda projekte ediliyor
 * (projectLonLat saf bir fonksiyon); istemciye ilçe koordinatı taşınmıyor.
 */
export type MapRoute = {
  id: string;
  label: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  /**
   * `ic`: alış ve teslim seçili ilde. `dis`: seçili ilden çıkıp başka bir ile
   * gidiyor — hedefi kadrajın dışında kalıyor, kenarda etiketle gösteriliyor.
   */
  kind: 'ic' | 'dis';
  /** İl dışı rotanın hedefi; tıklanınca o ile süzülüyor. */
  href?: string;
};

/** Haritada bir ilin durumu; sunucudan geliyor. */
export type ProvinceStat = {
  /** API'deki yazım — "Hakkari". */
  name: string;
  cityCode: string;
  count: number;
};

/** Seçili ilin bir ilçesindeki açık ilan sayısı. */
export type DistrictStat = { name: string; count: number };

/**
 * Küçük bir ilin ekranı doldurmasını engelleyen üst sınır. Yalova'yı sınırsız
 * büyütmek, sadeleştirilmiş sınırın köşelerini görünür kılıyor ve harita
 * bozuk görünüyordu.
 */
const EN_FAZLA_YAKINLASTIRMA = 5.5;

/** Seçilen ilin çevresinde bırakılan boşluk; il kenara yapışmasın. */
const KENAR_BOSLUGU = 30;

/** Kullanıcının elle yakınlaştırma aralığı; taban görünümün katı olarak. */
const EL_ZUM = { en_az: 1, en_cok: 14, adim: 1.45 };

type Gorunum = { k: number; tx: number; ty: number };

/** Kullanıcının tekerlek/sürükleme ile eklediği katman. */
type ElKatmani = { z: number; px: number; py: number };

const BASLANGIC: ElKatmani = { z: 1, px: 0, py: 0 };

const sinirla = (v: number, alt: number, ust: number) => Math.min(Math.max(v, alt), ust);

/**
 * Bir doğru parçasını görünür dikdörtgene kırpar; dışarı çıkan ucun kenardaki
 * yerini döndürür. Liang–Barsky'nin kısa hâli.
 *
 * <p>İl dışı rotalar için gerekiyor: hedef il kadrajın dışında kaldığından
 * çizgi ekrandan taşıyor. Etiketi taşan uca değil <em>kenarda kesiştiği
 * noktaya</em> koymak gerekiyor, yoksa "Ankara" yazısı görünmez bir yerde durur.
 */
export function kenarNoktasi(
  from: { x: number; y: number },
  to: { x: number; y: number },
  kutu: { x0: number; y0: number; x1: number; y1: number },
): { x: number; y: number } | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let t0 = 0;
  let t1 = 1;
  const kenarlar: [number, number][] = [
    [-dx, from.x - kutu.x0],
    [dx, kutu.x1 - from.x],
    [-dy, from.y - kutu.y0],
    [dy, kutu.y1 - from.y],
  ];
  for (const [p, q] of kenarlar) {
    if (p === 0) {
      if (q < 0) return null; // kutuya paralel ve dışarıda
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  // Başlangıç zaten içeride; bizi ilgilendiren çıkış noktası
  return { x: from.x + dx * t1, y: from.y + dy * t1 };
}

/**
 * İl ve ilçe seçilebilir Türkiye haritası.
 *
 * <p>Araç sahibi "bu yük bana yakın mı?" sorusunu ilçe adlarını okuyup kafasında
 * haritaya oturtarak cevaplıyordu. Burada iller doğrudan tıklanıyor: yük olan
 * iller boyalı, seçilen il ekranı dolduracak kadar yakınlaşıyor, ilçelerine
 * ayrılıyor ve altındaki liste o ile iniyor.
 *
 * <p>Seçim <strong>URL'de</strong> tutuluyor, bileşen durumunda değil. Böylece
 * süzgeç sunucuda uygulanıyor (liste zaten öyle çalışıyordu), bağlantı
 * paylaşılabiliyor ve geri tuşu çalışıyor. Yakınlaştırma da bunun sonucu:
 * seçim değişince dönüşüm değişiyor, CSS geçişi aradaki yolu kendisi çiziyor.
 *
 * <p>Kullanıcının kendi yakınlaştırması bunun <em>üstüne</em> biniyor ve durumda
 * tutuluyor — URL'e yazılsaydı her tekerlek hareketi gezinme geçmişine bir kayıt
 * bırakırdı. Seçim değişince sıfırlanıyor: bir ile bakarken bırakılan kaydırma,
 * sonraki ilde kadrajı boş bir yere düşürüyordu.
 *
 * <p>Sınırlar illerin kendi çizgisinden geliyor, ayrı bir sınır katmanı yok:
 * komşuların paylaştığı yay üretimde tek kez sadeleştirildiği için iki ilin
 * kenarı birebir örtüşüyor (bkz. scripts/build-maps.mjs).
 */
export function ProvinceMap({
  provinces,
  selectedCityCode,
  selectedDistrict = null,
  vehicleFilter = '',
  basePath,
  routes = [],
  districts = [],
  districtStats = [],
}: {
  provinces: ProvinceStat[];
  selectedCityCode: string | null;
  /** Seçili ilçe adı; haritada vurgulanıyor ve liste ona iniyor. */
  selectedDistrict?: string | null;
  /** Korunması gereken araç süzgeci; il değişince kaybolmasın. */
  vehicleFilter?: string;
  /** Süzgecin uygulanacağı sayfa — herkese açık pano ya da sürücü paneli. */
  basePath: string;
  /** Seçili ille ilgili ilanların izleri; yalnızca yakınlaşınca çiziliyor. */
  routes?: MapRoute[];
  /**
   * Seçili ilin ilçe sınırları. Sunucu yalnızca o ilinkini yolluyor: tamamı
   * 366 KB, en büyük il 40 KB'ın altında (bkz. districts.ts).
   */
  districts?: DistrictShape[];
  /** İlçe başına açık ilan sayısı; tıklanabilirliği bu belirliyor. */
  districtStats?: DistrictStat[];
}) {
  // geoBoundaries "Hakkâri" diyor, veritabanı "Hakkari": ham eşitlik o ili
  // sessizce boş gösterirdi
  const byName = useMemo(
    () => new Map(provinces.map((p) => [normalize(p.name), p])),
    [provinces],
  );

  const ilceSayilari = useMemo(
    () => new Map(districtStats.map((d) => [normalize(d.name), d.count])),
    [districtStats],
  );

  const selected = selectedCityCode
    ? (provinces.find((p) => p.cityCode === selectedCityCode) ?? null)
    : null;

  const href = (cityCode: string | null, district: string | null = null) =>
    suzgecHref(basePath, vehicleFilter, cityCode, district);

  const taban: Gorunum = useMemo(() => {
    const yok = { k: 1, tx: 0, ty: 0 };
    if (!selected) return yok;
    const sekil = PROVINCE_SHAPES.find((s) => normalize(s.name) === normalize(selected.name));
    if (!sekil) return yok;
    const [bx, by, bw, bh] = sekil.box;
    const k = Math.min(
      MAP_BOX.w / (bw + KENAR_BOSLUGU * 2),
      MAP_BOX.h / (bh + KENAR_BOSLUGU * 2),
      EN_FAZLA_YAKINLASTIRMA,
    );
    // SVG'de dönüşümün başlangıcı 0,0: ölçekten sonra ilin merkezi kutunun
    // merkezine taşınıyor
    return { k, tx: MAP_BOX.w / 2 - k * (bx + bw / 2), ty: MAP_BOX.h / 2 - k * (by + bh / 2) };
  }, [selected]);

  const [el, setEl] = useState<ElKatmani>(BASLANGIC);

  // Yeni il, yeni kadraj: önceki ilde bırakılan kaydırma burada boş bir yere
  // bakıyor olurdu
  useEffect(() => setEl(BASLANGIC), [selectedCityCode]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  /** Ekran pikselini viewBox birimine çevirir; SVG genişliği duyarlı. */
  const kutuya = useCallback((e: { clientX: number; clientY: number }) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    return { x: ((e.clientX - r.left) / r.width) * MAP_BOX.w, y: ((e.clientY - r.top) / r.height) * MAP_BOX.h };
  }, []);

  /**
   * Bir noktayı sabit tutarak yakınlaştırır.
   *
   * <p>Merkeze göre yakınlaştırmak, imlecin altındaki ilin kadrajdan kaçmasına
   * yol açıyordu: kullanıcı baktığı yere değil, kutunun ortasına yakınlaşıyor.
   */
  const yakinlastir = useCallback((carpan: number, odak?: { x: number; y: number } | null) => {
    setEl((o) => {
      const z = sinirla(o.z * carpan, EL_ZUM.en_az, EL_ZUM.en_cok);
      if (z === o.z) return o;
      const p = odak ?? { x: MAP_BOX.w / 2, y: MAP_BOX.h / 2 };
      const oran = z / o.z;
      return { z, px: p.x - (p.x - o.px) * oran, py: p.y - (p.y - o.py) * oran };
    });
  }, []);

  const surukleme = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  /*
   * Sürükleme DURUMDA da tutuluyor, yalnızca ref'te değil. İmleç biçimi ve geçişin
   * kapanması render sırasında okunuyor; ref render'ı tetiklemediği için bunlar
   * ancak başka bir sebeple yeniden çizildiğinde güncelleniyordu — şimdilik
   * kaydırma zaten setEl çağırdığı için çalışıyor ama tesadüfe dayanıyor.
   */
  const [suruklenuyor, setSurukleniyor] = useState(false);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Bağlantıya basmak seçim demek, kaydırma değil: sürükleme yalnızca boş
    // zeminde başlıyor ve zaten yakınlaşılmışsa anlamlı
    if (el.z === 1 && !selected) return;
    const p = kutuya(e);
    if (!p) return;
    surukleme.current = { x: p.x, y: p.y, px: el.px, py: el.py };
    setSurukleniyor(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = surukleme.current;
    if (!s) return;
    const p = kutuya(e);
    if (!p) return;
    // Eşik: küçük titremeler tıklamayı sürüklemeye çevirip bağlantıyı yutuyordu
    if (Math.abs(p.x - s.x) + Math.abs(p.y - s.y) < 2) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setEl((o) => ({ ...o, px: s.px + (p.x - s.x), py: s.py + (p.y - s.y) }));
  };

  const onPointerUp = () => {
    surukleme.current = null;
    setSurukleniyor(false);
  };

  /*
   * Tekerlek dinleyicisi elle bağlanıyor: React'in onWheel'i passive olarak
   * kaydediliyor ve preventDefault çağrısı yok sayılıyor — sayfa harita
   * üzerinde kayıyordu.
   */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const dinle = (e: WheelEvent) => {
      e.preventDefault();
      yakinlastir(e.deltaY < 0 ? EL_ZUM.adim : 1 / EL_ZUM.adim, kutuya(e));
    };
    svg.addEventListener('wheel', dinle, { passive: false });
    return () => svg.removeEventListener('wheel', dinle);
  }, [yakinlastir, kutuya]);

  /*
   * CSS sözdizimi, SVG öznitelik sözdizimi değil: `translate(50 20)` geçerli
   * CSS olmadığı için tarayıcı bildirimin tamamını atıyor ve dönüşüm sessizce
   * uygulanmıyordu. Birim px; SVG'de kullanıcı birimine karşılık geliyor.
   *
   * Sıra önemli: önce kullanıcının katmanı, sonra ilin oturtması. Tersi olsaydı
   * kaydırma miktarı yakınlaştırmayla çarpılır ve elde tutulamazdı.
   */
  const transform =
    `translate(${el.px.toFixed(1)}px, ${el.py.toFixed(1)}px) scale(${el.z.toFixed(3)}) ` +
    `translate(${taban.tx.toFixed(1)}px, ${taban.ty.toFixed(1)}px) scale(${taban.k.toFixed(3)})`;

  // Yakınlaştırma ölçeği: dönüşümün içinde çizilen noktalar onunla birlikte
  // büyüyor, yarıçapı bölmezsek il seçilince baloncuklara dönüşüyorlar
  const olcek = taban.k * el.z;

  /** Görünür alanın dünya koordinatındaki karşılığı; kenar etiketleri için. */
  const gorunurKutu = useMemo(() => {
    const Tx = el.px + el.z * taban.tx;
    const Ty = el.py + el.z * taban.ty;
    const pay = 12 / olcek; // etiket kenara yapışmasın
    return {
      x0: -Tx / olcek + pay,
      y0: -Ty / olcek + pay,
      x1: (MAP_BOX.w - Tx) / olcek - pay,
      y1: (MAP_BOX.h - Ty) / olcek - pay,
    };
  }, [el, taban, olcek]);

  const yuklu = provinces.filter((p) => p.count > 0).length;
  const icSayi = routes.filter((r) => r.kind === 'ic').length;
  const disSayi = routes.filter((r) => r.kind === 'dis').length;

  const dugme =
    'pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-field bg-surface/90 text-lg font-bold leading-none shadow-card backdrop-blur-sm transition hover:text-[var(--route-deep)] disabled:opacity-40';

  return (
    <figure className="relative overflow-hidden rounded-card border border-line bg-surface">
      <svg
        ref={svgRef}
        viewBox={MAP_VIEWBOX}
        className={`block w-full touch-none ${suruklenuyor ? 'cursor-grabbing' : el.z > 1 ? 'cursor-grab' : ''}`}
        role="img"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        aria-label={
          selected
            ? `Türkiye haritası, ${selected.name} seçili`
            : `Türkiye haritası; ${yuklu} ilde açık ilan var`
        }
      >
        <g
          style={{
            transform,
            // Hesap 0,0'ı başlangıç kabul ediyor; CSS'in %50 varsayılanı ile
            // birlikte il kutunun ortasına değil rastgele bir yere düşerdi
            transformBox: 'view-box',
            transformOrigin: '0 0',
            // Elle yakınlaştırmada geçiş yok: her tekerlek adımı yarım saniye
            // sürerdi ve hareket macunlaşırdı. Geçiş yalnızca il değişiminde.
            transition: suruklenuyor ? 'none' : 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {PROVINCE_SHAPES.map((sekil) => {
            const il = byName.get(normalize(sekil.name));
            const secili = !!il && !!selected && il.cityCode === selected.cityCode;
            const dolu = (il?.count ?? 0) > 0;
            // Seçim varken diğer iller geri çekiliyor: yakınlaştırılmış görünümde
            // kenardan giren komşular seçili ilin şeklini okumayı zorlaştırıyordu
            const soluk = !!selected && !secili;

            const yol = (
              <path
                d={sekil.d}
                /*
                 * Boş iller tek bir kütle gibi okunuyor, sınırlar aralarından
                 * yüzey renginde geçiyor. --surface-2 dolgu denendi ve kartın
                 * beyazından ayırt edilemiyordu: sınırlar kaybolunca harita
                 * Türkiye silüetine dönüşüyor, iller seçilebilir görünmüyordu.
                 */
                fill={dolu ? 'var(--route)' : 'var(--ink)'}
                fillOpacity={dolu ? (secili ? 1 : 0.75) : 0.16}
                stroke="var(--surface)"
                strokeWidth={1.1}
                strokeLinejoin="round"
                // Yakınlaştırınca çizgi kalınlaşmasın: sınır her ölçekte aynı
                vectorEffect="non-scaling-stroke"
                className={[
                  'transition-[fill-opacity,opacity] duration-300',
                  soluk ? 'opacity-25' : 'opacity-100',
                  il ? 'cursor-pointer hover:fill-[var(--route-hover)]' : '',
                ].join(' ')}
              />
            );

            // Yükü olmayan il tıklanabilir değil: gri bir ile basıp "burada
            // ilan yok" sayfasına düşmek, süzgeç değil çıkmaz sokak olurdu
            if (!il || il.count === 0) return <g key={sekil.name}>{yol}</g>;

            return (
              <Link
                key={sekil.name}
                href={secili ? href(null) : href(il.cityCode)}
                aria-label={
                  secili
                    ? `${il.name} süzgecini kaldır`
                    : `${il.name} — ${il.count} açık ilan`
                }
              >
                <title>{`${il.name} · ${il.count} ilan`}</title>
                {yol}
              </Link>
            );
          })}

          {/*
            İlçe sınırları yalnızca yakınlaşınca. Ülke görünümünde 973 ilçe hem
            okunmuyor hem de ilin kendi sınırını yutuyordu.

            İlanı olan ilçe tıklanabilir — ilde olduğu gibi. Boş ilçe yalnızca
            çizgi: basıp boş listeye düşmek çıkmaz sokak olurdu. Katalogda
            gerçek ilçe listesi bulunan illerde (İstanbul, Ankara, Hatay) bu
            çalışıyor; diğerlerinde tek bir "Merkez" var ve hiçbir ilçe
            tıklanabilir görünmüyor — veri ne kadarsa arayüz o kadar söz veriyor.
          */}
          {selected &&
            districts.map((ilce) => {
              const sayi = ilceSayilari.get(normalize(ilce.name)) ?? 0;
              const ilceSecili = !!selectedDistrict && normalize(selectedDistrict) === normalize(ilce.name);
              const cizgi = (
                <path
                  d={ilce.d}
                  fill={ilceSecili ? 'var(--route-deep)' : sayi > 0 ? 'var(--route-soft)' : 'none'}
                  fillOpacity={ilceSecili ? 0.55 : sayi > 0 ? 0.45 : 0}
                  stroke="var(--surface)"
                  strokeWidth={0.8}
                  strokeOpacity={0.85}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className={sayi > 0 ? 'cursor-pointer transition-[fill-opacity] hover:fill-[var(--route-deep)]' : ''}
                />
              );
              if (sayi === 0) {
                return (
                  <g key={ilce.name} pointerEvents="none">
                    {cizgi}
                    <title>{ilce.name}</title>
                  </g>
                );
              }
              return (
                <Link
                  key={ilce.name}
                  href={
                    ilceSecili
                      ? href(selected.cityCode)
                      : href(selected.cityCode, ilce.name)
                  }
                  aria-label={
                    ilceSecili ? `${ilce.name} süzgecini kaldır` : `${ilce.name} — ${sayi} açık ilan`
                  }
                >
                  <title>{`${ilce.name} · ${sayi} ilan`}</title>
                  {cizgi}
                </Link>
              );
            })}

          {/*
            Rotalar dönüşümün İÇİNDE: ilçe koordinatları ülke uzayında, haritayla
            birlikte yakınlaşmaları gerekiyor. Çizgi kalınlığı ve nokta yarıçapı
            ölçeğe bölünüyor, yoksa yakınlaşınca baloncuk oluyorlar.

            Yalnızca seçim varken çiziliyor: ülke görünümünde bir ilin içindeki
            beş kilometrelik rota tek piksele iniyor, kalabalıktan başka bir şey
            üretmiyordu.
          */}
          {selected &&
            routes.map((r) => {
              if (r.kind === 'ic') {
                // Hafif yay: aynı iki ilçe arasındaki birden çok ilan üst üste
                // binmesin diye
                const bend = 0.18;
                const mx = (r.from.x + r.to.x) / 2 + (r.to.y - r.from.y) * bend;
                const my = (r.from.y + r.to.y) / 2 - (r.to.x - r.from.x) * bend;
                return (
                  <g key={r.id}>
                    <title>{r.label}</title>
                    <path
                      d={`M${r.from.x} ${r.from.y}Q${mx.toFixed(1)} ${my.toFixed(1)} ${r.to.x} ${r.to.y}`}
                      fill="none"
                      stroke="var(--route-deep)"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle cx={r.from.x} cy={r.from.y} r={4 / olcek} fill="var(--route-deep)" />
                    <circle
                      cx={r.to.x}
                      cy={r.to.y}
                      r={4 / olcek}
                      fill="var(--surface)"
                      stroke="var(--route-deep)"
                      strokeWidth={1.6}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              }

              /*
               * İl dışı rota: hedef başka bir ilde ve kadraj seçili ile
               * oturtulduğu için çizgi ekrandan taşıyor. Uzaklaşınca tamamı
               * görünüyor; yakınken kenarda bir ok ve hedefin adı duruyor ki
               * "bu ilden nereye yük gidiyor?" sorusu zum yapmadan da cevaplansın.
               */
              const uc = kenarNoktasi(r.from, r.to, gorunurKutu) ?? r.to;
              const aci = (Math.atan2(r.to.y - r.from.y, r.to.x - r.from.x) * 180) / Math.PI;
              return (
                <g key={r.id}>
                  <title>{r.label}</title>
                  <line
                    x1={r.from.x}
                    y1={r.from.y}
                    x2={uc.x}
                    y2={uc.y}
                    stroke="var(--route-deep)"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeDasharray="5 4"
                    strokeOpacity={0.75}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={r.from.x} cy={r.from.y} r={3.5 / olcek} fill="var(--route-deep)" />
                  <g transform={`translate(${uc.x} ${uc.y}) rotate(${aci.toFixed(1)}) scale(${(1 / olcek).toFixed(4)})`}>
                    <path d="M0 0L-9 4.5L-9 -4.5Z" fill="var(--route-deep)" />
                  </g>
                </g>
              );
            })}
        </g>
      </svg>

      {/* Etiket ve düğmeler SVG'nin dışında: dönüşümün içinde olsalardı ille
          birlikte ölçeklenir, yakınlaştırmada devasa görünürlerdi. */}
      <figcaption className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <span className="rounded-field bg-surface/90 px-3 py-1.5 text-sm font-semibold shadow-card backdrop-blur-sm">
          {selected
            ? [
                selectedDistrict ? `${selected.name} · ${selectedDistrict}` : selected.name,
                // İlçe seçiliyken ilin sayısını yazmak listedekiyle çelişiyordu:
                // "Beşiktaş · 12 ilan" diyip altında iki kart göstermek, süzgecin
                // çalışmadığını düşündürüyor
                `${
                  selectedDistrict
                    ? (ilceSayilari.get(normalize(selectedDistrict)) ?? 0)
                    : selected.count
                } ilan`,
                icSayi > 0 ? `${icSayi} il içi` : null,
                disSayi > 0 ? `${disSayi} il dışı` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : `${yuklu} ilde açık ilan var`}
        </span>
        <span className="flex items-center gap-2">
          {selected && (
            <Link
              href={href(null)}
              className="pointer-events-auto inline-flex min-h-11 items-center rounded-field bg-surface/90 px-3 text-sm font-semibold shadow-card backdrop-blur-sm transition hover:text-[var(--route-deep)]"
            >
              Tüm iller
            </Link>
          )}
        </span>
      </figcaption>

      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button type="button" className={dugme} onClick={() => yakinlastir(EL_ZUM.adim)} aria-label="Yakınlaştır">
          +
        </button>
        <button
          type="button"
          className={dugme}
          onClick={() => yakinlastir(1 / EL_ZUM.adim)}
          aria-label="Uzaklaştır"
          disabled={el.z <= EL_ZUM.en_az}
        >
          −
        </button>
        <button
          type="button"
          className={`${dugme} text-[11px] font-semibold`}
          onClick={() => setEl(BASLANGIC)}
          aria-label="Görünümü sıfırla"
          disabled={el.z === 1 && el.px === 0 && el.py === 0}
        >
          sıfırla
        </button>
      </div>
    </figure>
  );
}

/**
 * Haritanın klavye karşılığı.
 *
 * <p>Seksen bir yolu tek tek sekmeye açmak klavye kullanıcısını haritanın
 * içinde kilitlerdi. Yükü olan iller burada kısa bir liste hâlinde duruyor —
 * hem erişilebilir yol bu, hem de "hangi ilde iş var?" sorusunun okunabilir
 * cevabı.
 */
export function ProvinceList({
  provinces,
  selectedCityCode,
  vehicleFilter = '',
  basePath,
}: {
  provinces: ProvinceStat[];
  selectedCityCode: string | null;
  vehicleFilter?: string;
  basePath: string;
}) {
  const yuklu = provinces
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr'));

  if (yuklu.length === 0) return null;

  const href = (cityCode: string | null) => suzgecHref(basePath, vehicleFilter, cityCode);

  return (
    <nav aria-label="İle göre süz" className="mt-3 flex flex-wrap gap-2">
      {yuklu.map((il) => {
        const secili = il.cityCode === selectedCityCode;
        return (
          <Link
            key={il.cityCode}
            href={secili ? href(null) : href(il.cityCode)}
            aria-current={secili ? 'true' : undefined}
            className={[
              'inline-flex min-h-11 items-center gap-2 rounded-field border px-3.5 text-sm transition',
              secili
                ? 'border-[var(--route-deep)] bg-[var(--route-soft)] font-semibold'
                : 'border-line hover:border-muted',
            ].join(' ')}
          >
            {il.name}
            <span className="label-mono text-muted">{il.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * İlçe süzgecinin klavye ve dokunma karşılığı.
 *
 * <p>Haritada ilçeye basmak küçük ekranda zor: İstanbul'un ilçeleri telefonda
 * birkaç milimetre. Ayrıca bu liste, hangi ilçelerde iş olduğunu haritayı
 * okumadan söylüyor.
 */
export function DistrictList({
  districtStats,
  selectedCityCode,
  selectedDistrict,
  vehicleFilter = '',
  basePath,
}: {
  districtStats: DistrictStat[];
  selectedCityCode: string;
  selectedDistrict: string | null;
  vehicleFilter?: string;
  basePath: string;
}) {
  const yuklu = districtStats
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr'));

  // Tek ilçe varsa süzgeç bir şey yapmıyor: katalogda o ilin yalnızca "Merkez"i
  // olduğu durum bu ve boş bir çip sırası göstermek kullanıcıya yalan söylerdi
  if (yuklu.length < 2) return null;

  return (
    <nav aria-label="İlçeye göre süz" className="mt-3 flex flex-wrap gap-2">
      {yuklu.map((ilce) => {
        const secili = !!selectedDistrict && normalize(selectedDistrict) === normalize(ilce.name);
        return (
          <Link
            key={ilce.name}
            href={
              secili
                ? suzgecHref(basePath, vehicleFilter, selectedCityCode)
                : suzgecHref(basePath, vehicleFilter, selectedCityCode, ilce.name)
            }
            aria-current={secili ? 'true' : undefined}
            className={[
              'inline-flex min-h-11 items-center gap-2 rounded-field border px-3.5 text-sm transition',
              secili
                ? 'border-[var(--route-deep)] bg-[var(--route-soft)] font-semibold'
                : 'border-line hover:border-muted',
            ].join(' ')}
          >
            {ilce.name}
            <span className="label-mono text-muted">{ilce.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
