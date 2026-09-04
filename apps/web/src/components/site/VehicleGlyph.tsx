/**
 * Araç ikonları. Tasarımdaki çizgisel dil: tek ağırlıkta stroke, yuvarlak uçlar,
 * araç büyüdükçe artan aks sayısı.
 */
export function VehicleGlyph({ code, className }: { code: string; className?: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg viewBox="0 0 32 20" className={className} aria-hidden {...common}>
      {code === 'MOTOKURYE' ? (
        <>
          <circle cx="6" cy="14" r="3.4" />
          <circle cx="25" cy="14" r="3.4" />
          <path d="M9.4 14h5.2l3-5.6h6.2" />
          <path d="M17.6 8.4 15 14M20.5 8.4h4.6l1.4 5.6" />
        </>
      ) : (
        <>
          {/* Kasa */}
          <path d={boxPath(code)} />
          {/* Kabin */}
          <path d={cabPath(code)} />
          {/* Akslar */}
          {axles(code).map((cx) => (
            <circle key={cx} cx={cx} cy="15.4" r="2.2" />
          ))}
        </>
      )}
    </svg>
  );
}

/** Kasa uzunluğu araç tipiyle birlikte büyür. */
function boxPath(code: string) {
  const right = { PANELVAN: 20, KAMYONET: 23, KAMYON: 26, KIRKAYAK: 28, TIR: 29 }[code] ?? 23;
  const top = code === 'PANELVAN' ? 6 : 4.5;
  return `M2 ${top}h${right - 2}v${15.4 - top - 2.2}H2z`;
}

function cabPath(code: string) {
  const start = { PANELVAN: 20, KAMYONET: 23, KAMYON: 26, KIRKAYAK: 28, TIR: 29 }[code] ?? 23;
  return `M${start} 9h3.4l2.6 3v2.2H${start}z`;
}

function axles(code: string): number[] {
  switch (code) {
    case 'PANELVAN':
      return [6, 22];
    case 'KAMYONET':
      return [6, 25];
    case 'KAMYON':
      return [6, 21, 25.5];
    case 'KIRKAYAK':
      return [6, 10, 22, 26.5];
    case 'TIR':
      return [5, 9, 20, 24, 28];
    default:
      return [6, 24];
  }
}
