'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { MAP_BOX, MAP_VIEWBOX } from '@/components/hero/geo-data';
import { normalize } from '@/lib/places';
import type { DistrictShape } from './district-shapes';
import { PROVINCE_SHAPES } from './province-shapes';

/**
 * Süzgeç bağlantısı. İki sayfa da aynı kuralı kullanıyor: seçim `il`
 * parametresinde, araç süzgeci korunuyor, seçili ile tekrar basmak temizliyor.
 */
function suzgecHref(basePath: string, vehicleFilter: string, cityCode: string | null): string {
  const q = new URLSearchParams();
  if (vehicleFilter) q.set('arac', vehicleFilter);
  if (cityCode) q.set('il', cityCode);
  const s = q.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/**
 * İl içi bir ilanın haritadaki izi. Noktalar sunucuda projekte ediliyor
 * (projectLonLat saf bir fonksiyon); istemciye ilçe koordinatı taşınmıyor.
 */
export type MapRoute = {
  id: string;
  label: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
};

/** Haritada bir ilin durumu; sunucudan geliyor. */
export type ProvinceStat = {
  /** API'deki yazım — "Hakkari". */
  name: string;
  cityCode: string;
  count: number;
};

/**
 * Küçük bir ilin ekranı doldurmasını engelleyen üst sınır. Yalova'yı sınırsız
 * büyütmek, sadeleştirilmiş sınırın köşelerini görünür kılıyor ve harita
 * bozuk görünüyordu.
 */
const EN_FAZLA_YAKINLASTIRMA = 5.5;

/** Seçilen ilin çevresinde bırakılan boşluk; il kenara yapışmasın. */
const KENAR_BOSLUGU = 30;

/**
 * İl seçilebilir Türkiye haritası.
 *
 * <p>Araç sahibi "bu yük bana yakın mı?" sorusunu ilçe adlarını okuyup kafasında
 * haritaya oturtarak cevaplıyordu. Burada iller doğrudan tıklanıyor: yük olan
 * iller boyalı, seçilen il ekranı dolduracak kadar yakınlaşıyor ve altındaki
 * liste o ile iniyor.
 *
 * <p>Seçim <strong>URL'de</strong> tutuluyor, bileşen durumunda değil. Böylece
 * süzgeç sunucuda uygulanıyor (liste zaten öyle çalışıyordu), bağlantı
 * paylaşılabiliyor ve geri tuşu çalışıyor. Yakınlaştırma da bunun sonucu:
 * seçim değişince dönüşüm değişiyor, CSS geçişi aradaki yolu kendisi çiziyor.
 *
 * <p>Sınırlar illerin kendi çizgisinden geliyor, ayrı bir sınır katmanı yok:
 * komşuların paylaştığı yay üretimde tek kez sadeleştirildiği için iki ilin
 * kenarı birebir örtüşüyor (bkz. scripts/build-maps.mjs).
 */
export function ProvinceMap({
  provinces,
  selectedCityCode,
  vehicleFilter = '',
  basePath,
  routes = [],
  districts = [],
}: {
  provinces: ProvinceStat[];
  selectedCityCode: string | null;
  /** Korunması gereken araç süzgeci; il değişince kaybolmasın. */
  vehicleFilter?: string;
  /** Süzgecin uygulanacağı sayfa — herkese açık pano ya da sürücü paneli. */
  basePath: string;
  /** Seçili ilin içinde başlayıp biten ilanlar; yalnızca yakınlaşınca çiziliyor. */
  routes?: MapRoute[];
  /**
   * Seçili ilin ilçe sınırları. Sunucu yalnızca o ilinkini yolluyor: tamamı
   * 366 KB, en büyük il 40 KB'ın altında (bkz. districts.ts).
   */
  districts?: DistrictShape[];
}) {
  // geoBoundaries "Hakkâri" diyor, veritabanı "Hakkari": ham eşitlik o ili
  // sessizce boş gösterirdi
  const byName = useMemo(
    () => new Map(provinces.map((p) => [normalize(p.name), p])),
    [provinces],
  );

  const selected = selectedCityCode
    ? (provinces.find((p) => p.cityCode === selectedCityCode) ?? null)
    : null;

  const href = (cityCode: string | null) => suzgecHref(basePath, vehicleFilter, cityCode);

  const gorunum = useMemo(() => {
    if (!selected) return null;
    const sekil = PROVINCE_SHAPES.find((s) => normalize(s.name) === normalize(selected.name));
    if (!sekil) return null;
    const [bx, by, bw, bh] = sekil.box;
    const k = Math.min(
      MAP_BOX.w / (bw + KENAR_BOSLUGU * 2),
      MAP_BOX.h / (bh + KENAR_BOSLUGU * 2),
      EN_FAZLA_YAKINLASTIRMA,
    );
    // SVG'de dönüşümün başlangıcı 0,0: ölçekten sonra ilin merkezi kutunun
    // merkezine taşınıyor
    const tx = MAP_BOX.w / 2 - k * (bx + bw / 2);
    const ty = MAP_BOX.h / 2 - k * (by + bh / 2);
    /*
     * CSS sözdizimi, SVG öznitelik sözdizimi değil: `translate(50 20)` geçerli
     * CSS olmadığı için tarayıcı bildirimin tamamını atıyor ve dönüşüm sessizce
     * uygulanmıyordu. Birim px; SVG'de kullanıcı birimine karşılık geliyor.
     */
    return {
      css: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(3)})`,
      k,
    };
  }, [selected]);

  // Yakınlaştırma ölçeği: dönüşümün içinde çizilen noktalar onunla birlikte
  // büyüyor, yarıçapı bölmezsek il seçilince baloncuklara dönüşüyorlar
  const olcek = gorunum?.k ?? 1;

  const yuklu = provinces.filter((p) => p.count > 0).length;

  return (
    <figure className="relative overflow-hidden rounded-card border border-line bg-surface">
      <svg
        viewBox={MAP_VIEWBOX}
        className="block w-full"
        role="img"
        aria-label={
          selected
            ? `Türkiye haritası, ${selected.name} seçili`
            : `Türkiye haritası; ${yuklu} ilde açık ilan var`
        }
      >
        <g
          style={{
            transform: gorunum?.css,
            // Hesap 0,0'ı başlangıç kabul ediyor; CSS'in %50 varsayılanı ile
            // birlikte il kutunun ortasına değil rastgele bir yere düşerdi
            transformBox: 'view-box',
            transformOrigin: '0 0',
            transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
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
            okunmuyor hem de ilin kendi sınırını yutuyordu; seçilen ilin içi
            boş kalmasın diye burada, seçimle birlikte açılıyor.

            İlanlar ilçe düzeyinde duruyor (ADR-0008: adres toplanmıyor), yani
            haritanın çözünürlüğü verinin çözünürlüğüyle aynı. Sokak çizmek,
            bilmediğimiz bir hassasiyeti biliyormuş gibi göstermek olurdu.
          */}
          {selected &&
            districts.map((ilce) => (
              <path
                key={ilce.name}
                d={ilce.d}
                fill="none"
                stroke="var(--surface)"
                strokeWidth={0.8}
                strokeOpacity={0.85}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              >
                <title>{ilce.name}</title>
              </path>
            ))}

          {/*
            İl içi ilanlar dönüşümün İÇİNDE: ilçe koordinatları ülke uzayında,
            haritayla birlikte yakınlaşmaları gerekiyor. Çizgi kalınlığı ve
            nokta yarıçapı ölçeğe bölünüyor, yoksa yakınlaşınca baloncuk
            oluyorlar.

            Yalnızca seçim varken çiziliyor: ülke görünümünde bir ilin içindeki
            beş kilometrelik rota tek piksele iniyor, kalabalıktan başka bir şey
            üretmiyordu.
          */}
          {selected &&
            routes.map((r) => {
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
            })}
        </g>
      </svg>

      {/* Etiket SVG'nin dışında: dönüşümün içinde olsaydı ille birlikte
          ölçeklenir, yakınlaştırmada devasa görünürdü. */}
      <figcaption className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <span className="rounded-field bg-surface/90 px-3 py-1.5 text-sm font-semibold shadow-card backdrop-blur-sm">
          {selected
            ? `${selected.name} · ${selected.count} ilan${routes.length > 0 ? ` · ${routes.length}'i il içi` : ''}`
            : `${yuklu} ilde açık ilan var`}
        </span>
        {selected && (
          <Link
            href={href(null)}
            className="pointer-events-auto inline-flex min-h-11 items-center rounded-field bg-surface/90 px-3 text-sm font-semibold shadow-card backdrop-blur-sm transition hover:text-[var(--route-deep)]"
          >
            Tüm iller
          </Link>
        )}
      </figcaption>
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
