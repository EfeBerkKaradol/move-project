'use client';

import type { VehicleType } from '@turmove/contracts';

/**
 * Filo dizilimi: motordan tıra tüm araçlar yan yana, <strong>gerçek kasa boyu
 * oranlarıyla</strong>.
 *
 * <p>Referans ürünler bunu bir filo fotoğrafıyla yapıyor. Burada çizim tercih edildi:
 * ölçek gerçek ölçülerden türediği için görsel aynı zamanda doğru bilgi veriyor —
 * fotoğrafta perspektif araç oranlarını yanıltıcı gösterebiliyor.
 *
 * <p>Araç adları burada yazılmıyor: en küçük araç toplam genişliğin ~%3'ünü kapladığı
 * için etiketler kaçınılmaz olarak çakışıyordu. Adlar ve ölçüler alttaki filo
 * bölümünde, okunacak yerde duruyor.
 */
export function FleetLineup({ vehicles }: { vehicles: VehicleType[] }) {
  const sorted = [...vehicles].sort((a, b) => a.innerLengthCm - b.innerLengthCm);
  const longest = Math.max(...sorted.map((v) => v.innerLengthCm));

  const GAP = 14;
  const totalUnits = sorted.reduce((sum, v) => sum + v.innerLengthCm / longest, 0);
  const usable = 1000 - GAP * (sorted.length - 1);
  const GROUND = 168;

  let cursor = 0;
  const placed = sorted.map((v) => {
    const width = (v.innerLengthCm / longest / totalUnits) * usable;
    const x = cursor;
    cursor += width + GAP;
    return { v, x, width };
  });

  return (
    <svg
      viewBox="-8 0 1016 200"
      className="w-full"
      role="img"
      aria-label={`Araç filosu, küçükten büyüğe gerçek oranlarıyla: ${sorted
        .map((v) => v.displayName)
        .join(', ')}`}
    >
      <g stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" opacity="0.28">
        {Array.from({ length: 20 }, (_, i) => (
          <line key={i} x1={i * 52} y1={GROUND + 14} x2={i * 52 + 28} y2={GROUND + 14} />
        ))}
      </g>
      <line x1="-8" y1={GROUND} x2="1008" y2={GROUND} stroke="var(--line)" strokeWidth="2" />

      {placed.map(({ v, x, width }, i) => (
        <g key={v.code} className="animate-drive" style={{ animationDelay: `${i * 110}ms` }}>
          {v.code === 'MOTOR' ? (
            <Scooter x={x} width={width} ground={GROUND} />
          ) : (
            <Truck
              x={x}
              width={width}
              ground={GROUND}
              scale={v.innerLengthCm / longest}
              articulated={v.code === 'TIR'}
            />
          )}
        </g>
      ))}
    </svg>
  );
}

/** İki tekerlekli kurye motoru — kamyon siluetiyle karıştırılmamalı. */
function Scooter({ x, width, ground }: { x: number; width: number; ground: number }) {
  const w = Math.max(width, 26);
  const r = w * 0.22;
  const cy = ground - r;
  return (
    <>
      <rect x={x + w * 0.28} y={cy - w * 0.62} width={w * 0.44} height={w * 0.42} rx="3" fill="var(--brand)" />
      <path
        d={`M ${x + w * 0.2} ${cy} q ${w * 0.1} ${-w * 0.34} ${w * 0.34} ${-w * 0.3} h ${w * 0.3}`}
        stroke="var(--brand-deep)"
        strokeWidth={Math.max(w * 0.09, 2)}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={x + w * 0.22} cy={cy} r={r} fill="var(--wheel)" />
      <circle cx={x + w * 0.82} cy={cy} r={r} fill="var(--wheel)" />
    </>
  );
}

/**
 * Kabin + kasa. Kabin kasadan alçak ve kısa; büyük araçlarda aks sayısı artıyor.
 * Tır ayrıca çekici ile dorse arasında boşluk taşıyor.
 */
function Truck({
  x,
  width,
  ground,
  scale,
  articulated,
}: {
  x: number;
  width: number;
  ground: number;
  scale: number;
  articulated: boolean;
}) {
  const bodyH = 26 + scale ** 0.42 * 74;
  const cabH = bodyH * 0.66;
  const cabW = Math.min(Math.max(width * 0.26, 16), 54);
  const wheelR = Math.max(5, Math.min(width * 0.045, 10));
  const axleY = ground - wheelR;
  const bodyTop = ground - bodyH;
  const cabTop = ground - cabH;

  const trailerGap = articulated ? width * 0.03 : 0;
  const bodyX = x + cabW + trailerGap;
  const bodyW = Math.max(width - cabW - trailerGap, 12);

  // Arka aks sayısı büyüklükle artar
  const rearAxles = scale > 0.75 ? 3 : scale > 0.4 ? 2 : 1;

  return (
    <>
      {/* Kasa */}
      <rect x={bodyX} y={bodyTop} width={bodyW} height={bodyH - wheelR} rx={Math.min(width * 0.02, 5)} fill="var(--brand)" />
      {/* Kasa üst şeridi — düz bloktan ayırır */}
      <rect x={bodyX} y={bodyTop} width={bodyW} height={Math.max(bodyH * 0.1, 3)} rx="2" fill="var(--brand-deep)" opacity="0.45" />

      {/* Kabin */}
      <path
        d={`M ${x} ${axleY} V ${cabTop + cabH * 0.22}
            Q ${x} ${cabTop} ${x + cabW * 0.3} ${cabTop}
            H ${x + cabW} V ${axleY} Z`}
        fill="var(--brand-deep)"
      />
      {/* Cam */}
      <rect
        x={x + cabW * 0.22}
        y={cabTop + cabH * 0.16}
        width={cabW * 0.56}
        height={cabH * 0.3}
        rx="2"
        fill="var(--sky-top)"
        opacity="0.95"
      />

      {/* Ön aks */}
      <circle cx={x + cabW * 0.55} cy={axleY} r={wheelR} fill="var(--wheel)" />
      {/* Arka akslar */}
      {Array.from({ length: rearAxles }, (_, i) => (
        <circle
          key={i}
          cx={bodyX + bodyW - wheelR * 1.6 - i * wheelR * 2.3}
          cy={axleY}
          r={wheelR}
          fill="var(--wheel)"
        />
      ))}
    </>
  );
}
