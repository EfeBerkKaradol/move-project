'use client';

import type { RefObject } from 'react';
import {
  CITIES,
  ISTANBUL_NODES,
  ISTANBUL_PATHS,
  ISTANBUL_PATHS_COMPACT,
  NETWORK_CITIES,
  MAP_BOX,
  MAP_VIEWBOX,
  ROUTE_BACK,
  ROUTE_CITY,
  ROUTE_OUT,
  TURKEY_PATH,
  TURKEY_PATH_COMPACT,
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
  // Telefonda kıyı çizgisinin ince detayı zaten görünmüyor; boyama maliyeti
  // görünüyor. Kaba sürüm aynı kutuya oturduğu için araç konumu değişmiyor.
  const istanbulPaths = compact ? ISTANBUL_PATHS_COMPACT : ISTANBUL_PATHS;
  const turkeyPath = compact ? TURKEY_PATH_COMPACT : TURKEY_PATH;

  /**
   * Her iki harita da kaydırma boyunca opaklık ve ölçek değiştiriyor. Kendi
   * derleme katmanına alınmazlarsa tarayıcı her karede yüzlerce yolu yeniden
   * raster ediyor; katmanla iş GPU'da bileşimden ibaret kalıyor.
   */
  const layer = { willChange: 'opacity, transform' } as const;

  return (
    <>
      {/* ── İstanbul yakın planı ─────────────────────────────────────── */}
      <svg
        viewBox={MAP_VIEWBOX}
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
        style={{
          ...layer,
          opacity: 'var(--ist-in, 0)',
          transform: 'scale(var(--ist-zoom, 1))',
          transformOrigin: '50% 50%',
        }}
      >
        {istanbulPaths.map((d, i) => (
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
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
        style={{
          ...layer,
          opacity: 'var(--tr-in, 0)',
          transform: 'scale(var(--tr-zoom, 1))',
          transformOrigin: origin,
        }}
      >
        {/* Ülke silüeti İstanbul yakın planından daha güçlü çiziliyor: rota bu
            ölçekte kısa ve haritanın kendisi anlatının zeminini kuruyor. */}
        <path
          d={turkeyPath}
          fill="rgb(255 255 255 / 0.055)"
          stroke="rgb(255 255 255 / 0.3)"
          strokeWidth={1.4}
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

        {/* Ağın geri kalanı: rotaya dahil olmayan iller. Küçük ve sabit —
            kaydırmayla aktifleşmiyorlar, haritanın Türkiye olduğunu ve kapsamın
            81 il olduğunu söylüyorlar. */}
        {NETWORK_CITIES.map((city) => (
          <g key={city.label} opacity={0.5}>
            <circle cx={city.x} cy={city.y} r={2.6} fill="var(--route)" />
            {!compact && (
              <text
                x={city.x}
                y={city.y + 15}
                textAnchor="middle"
                fill="#fff"
                fontSize={10}
                opacity={0.55}
                letterSpacing="0.02em"
              >
                {city.label}
              </text>
            )}
          </g>
        ))}

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
 * Kutu koordinatını kapsayıcı içindeki piksele çevirir.
 *
 * <p>Araç SVG'nin içinde değil üstünde duran bir HTML öğesi: fotogerçekçi bir
 * görsel `<image>` olarak ölçeklenirken netliğini kaybediyor. Konumu bu yüzden
 * elle hesaplanıyor.
 *
 * <p>Yüzde kullanmak yanlıştı. `preserveAspectRatio="xMidYMax meet"` haritayı
 * kapsayıcıya <em>sığdırıyor</em>: oranlar tutmadığında kenarlarda boşluk kalıyor
 * ve harita kutunun tamamını doldurmuyor. Yüzde hesabı doldurduğunu varsaydığı
 * için araç rotanın dışına düşüyordu — mobilde 56 piksel, masaüstünde kapsayıcı
 * oranı tesadüfen yakın olduğu için fark edilmeyecek kadar az.
 */
export function mapProjection(box: { width: number; height: number }) {
  const scale = Math.min(box.width / MAP_BOX.w, box.height / MAP_BOX.h);
  const offsetX = (box.width - MAP_BOX.w * scale) / 2;
  // SVG'ler `xMidYMax` ile alta hizalı: harita kutunun altına oturuyor, böylece
  // üstteki faz metniyle çakışması azalıyor. Buradaki hesap o hizayla birebir
  // aynı olmak zorunda, yoksa araç rotadan kayar.
  const offsetY = box.height - MAP_BOX.h * scale;
  return (x: number, y: number) => ({
    left: offsetX + x * scale,
    top: offsetY + y * scale,
  });
}
