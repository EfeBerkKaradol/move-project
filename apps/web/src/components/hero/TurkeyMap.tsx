'use client';

import type { RefObject } from 'react';
import { CITIES, MAP_VIEWBOX, ROUTE_BACK, ROUTE_OUT, TURKEY_PATH } from './map-geometry';

/**
 * Sahnenin haritası. Dekor değil: rota buradan geçiyor, düğümler sırayla aktifleşiyor,
 * araç bu yolların üzerinde yürüyor.
 *
 * <p>Şehir etiketleri mobilde gizleniyor — küçük ekranda üç etiket rotanın kendisini
 * okunmaz hâle getiriyordu.
 */
export function TurkeyMap({
  outRef,
  backRef,
  compact,
}: {
  outRef: RefObject<SVGPathElement | null>;
  backRef: RefObject<SVGPathElement | null>;
  /** Mobil kompozisyon: daha az detay, daha kalın rota. */
  compact?: boolean;
}) {
  return (
    <svg
      viewBox={MAP_VIEWBOX}
      className="absolute inset-0 size-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      style={{ opacity: 'var(--map-in, 0)' }}
    >
      {/* Ülke silüeti — çok hafif, rotayı bastırmayacak kadar */}
      <path d={TURKEY_PATH} fill="rgb(255 255 255 / 0.028)" stroke="rgb(255 255 255 / 0.14)"
        strokeWidth={1.2} strokeLinejoin="round" />

      {/* Enlem çizgileri: derinlik hissi, harita olduğunu hatırlatan minimum ızgara */}
      {!compact &&
        [120, 165, 210, 255].map((y) => (
          <line key={y} x1={40} x2={700} y1={y} y2={y}
            stroke="rgb(255 255 255 / 0.05)" strokeWidth={1} />
        ))}

      {/* Gidiş rotası: scroll ile çizilir */}
      <path
        ref={outRef}
        d={ROUTE_OUT}
        fill="none"
        stroke="var(--route)"
        strokeWidth={compact ? 3.4 : 2.6}
        strokeLinecap="round"
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 'calc(1 - var(--draw-out, 0))' }}
      />

      {/* Dönüş rotası — iki katman üst üste:
          altta kesikli/soluk "boş dönüş", üstte dolu "yüklü dönüş".
          Üstteki --loaded ile açılıyor; dönüşüm renk değişimi değil, yolun
          gerçekten dolması olarak okunuyor. */}
      <path
        ref={backRef}
        d={ROUTE_BACK}
        fill="none"
        stroke="rgb(255 255 255 / 0.34)"
        strokeWidth={compact ? 3 : 2.2}
        strokeLinecap="round"
        strokeDasharray="6 7"
        pathLength={1}
        style={{ opacity: 'calc(var(--draw-back, 0) * (1 - var(--loaded, 0) * 0.85))' }}
      />
      <path
        d={ROUTE_BACK}
        fill="none"
        stroke="var(--route)"
        strokeWidth={compact ? 3.4 : 2.6}
        strokeLinecap="round"
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 'calc(1 - var(--loaded, 0))' }}
      />

      {CITIES.map((city) => (
        <g key={city.id} style={{ opacity: `var(--n-${city.id}, 0.25)` }}>
          {/* Aktifken çekirdeğin etrafında yumuşak hâle */}
          <circle cx={city.x} cy={city.y} r={12} fill="var(--route)"
            style={{ opacity: `calc(var(--n-${city.id}, 0) * 0.18)` }} />
          <circle cx={city.x} cy={city.y} r={4.5} fill="var(--route)" />
          <circle cx={city.x} cy={city.y} r={4.5} fill="none"
            stroke="var(--route)" strokeWidth={1.4}
            style={{ opacity: `calc(var(--n-${city.id}, 0) * 0.5)` }} />
          {!compact && (
            <text x={city.x} y={city.y - 16} textAnchor="middle" fill="#fff"
              fontSize={13} fontWeight={600} letterSpacing="0.02em">
              {city.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
