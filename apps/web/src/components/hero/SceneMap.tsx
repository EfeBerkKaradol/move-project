'use client';

import type { RefObject } from 'react';
import {
  CITIES,
  ISTANBUL_NODES,
  ISTANBUL_PATHS,
  MAP_BOX,
  MAP_VIEWBOX,
  ROUTE_BACK,
  ROUTE_CITY,
  ROUTE_OUT,
  TURKEY_PATH,
} from './geo-data';

/**
 * Sahnenin iki haritası: İstanbul yakın planı ve Türkiye.
 *
 * <p>İkisi de gerçek sınır verisinden üretiliyor (bkz. geo-data.ts) ve aynı kutuya
 * oturuyor. Dekor değil: rota bu kıyılardan geçiyor, düğümler sırayla aktifleşiyor,
 * araç bu yolların üzerinde yürüyor.
 *
 * <p>Boğaz ayrı bir çizim değil — ilçe sınırlarının arasındaki boşluk. Gerçek
 * kıyı çizgisi olduğu için araç Avrupa yakasından Anadolu yakasına geçerken
 * suyun üzerinden geçtiği görülüyor.
 */
export function SceneMap({
  cityRouteRef,
  outRef,
  backRef,
  compact,
}: {
  cityRouteRef: RefObject<SVGPathElement | null>;
  outRef: RefObject<SVGPathElement | null>;
  backRef: RefObject<SVGPathElement | null>;
  /** Mobil kompozisyon: etiketsiz, daha kalın rota. */
  compact?: boolean;
}) {
  // Kamera İstanbul'un ülke haritasındaki yerine sabitlenerek geri çekiliyor
  const anchor = CITIES.find((c) => c.id === 'istanbul')!;
  const origin = `${((anchor.x / MAP_BOX.w) * 100).toFixed(1)}% ${((anchor.y / MAP_BOX.h) * 100).toFixed(1)}%`;
  const stroke = compact ? 3.2 : 2.4;

  return (
    <>
      {/* ── İstanbul yakın planı ─────────────────────────────────────── */}
      <svg
        viewBox={MAP_VIEWBOX}
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
        style={{
          opacity: 'var(--ist-in, 0)',
          transform: 'scale(var(--ist-zoom, 1))',
          transformOrigin: '50% 50%',
        }}
      >
        {ISTANBUL_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="rgb(255 255 255 / 0.025)"
            stroke="rgb(255 255 255 / 0.16)"
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
        ))}

        <path
          ref={cityRouteRef}
          d={ROUTE_CITY}
          fill="none"
          stroke="var(--route)"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 'calc(1 - var(--draw-city, 0))' }}
        />

        {ISTANBUL_NODES.map((node) => (
          <Node key={node.id} node={node} compact={compact} labelAbove />
        ))}
      </svg>

      {/* ── Türkiye ──────────────────────────────────────────────────── */}
      <svg
        viewBox={MAP_VIEWBOX}
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
        style={{
          opacity: 'var(--tr-in, 0)',
          transform: 'scale(var(--tr-zoom, 1))',
          transformOrigin: origin,
        }}
      >
        <path
          d={TURKEY_PATH}
          fill="rgb(255 255 255 / 0.028)"
          stroke="rgb(255 255 255 / 0.16)"
          strokeWidth={1.1}
          strokeLinejoin="round"
        />

        <path
          ref={outRef}
          d={ROUTE_OUT}
          fill="none"
          stroke="var(--route)"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 'calc(1 - var(--draw-out, 0))' }}
        />

        {/* Dönüş rotası iki katman: altta kesikli "boş dönüş", üstte dolu
            "yüklü dönüş". Dönüşüm renk değişimi değil, yolun gerçekten dolması. */}
        <path
          ref={backRef}
          d={ROUTE_BACK}
          fill="none"
          stroke="rgb(255 255 255 / 0.36)"
          strokeWidth={stroke - 0.4}
          strokeLinecap="round"
          strokeDasharray="6 7"
          style={{ opacity: 'calc(var(--draw-back, 0) * (1 - var(--loaded, 0) * 0.85))' }}
        />
        <path
          d={ROUTE_BACK}
          fill="none"
          stroke="var(--route)"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 'calc(1 - var(--loaded, 0))' }}
        />

        {CITIES.map((city) => (
          <Node key={city.id} node={city} compact={compact} />
        ))}
      </svg>
    </>
  );
}

function Node({
  node,
  compact,
  labelAbove,
}: {
  node: { id: string; label: string; x: number; y: number };
  compact?: boolean;
  labelAbove?: boolean;
}) {
  return (
    <g style={{ opacity: `calc(0.28 + var(--n-${node.id}, 0) * 0.72)` }}>
      <circle cx={node.x} cy={node.y} r={13} fill="var(--route)"
        style={{ opacity: `calc(var(--n-${node.id}, 0) * 0.16)` }} />
      <circle cx={node.x} cy={node.y} r={4.6} fill="var(--route)" />
      {!compact && (
        <text
          x={node.x}
          y={node.y + (labelAbove ? -15 : 24)}
          textAnchor="middle"
          fill="#fff"
          fontSize={13}
          fontWeight={600}
          letterSpacing="0.02em"
        >
          {node.label}
        </text>
      )}
    </g>
  );
}

/**
 * Kutu koordinatını kapsayıcı içindeki yüzdeye çevirir.
 *
 * <p>Araç SVG'nin içinde değil üstünde duran bir HTML öğesi: fotogerçekçi bir
 * görsel `<image>` olarak ölçeklenirken netliğini kaybediyor. İki harita da aynı
 * kutuya oturduğu için dönüşüm her sahnede aynı.
 */
export function toPercent(x: number, y: number) {
  return { left: (x / MAP_BOX.w) * 100, top: (y / MAP_BOX.h) * 100 };
}
