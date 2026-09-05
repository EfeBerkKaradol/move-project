/**
 * Araç ikonları. Tasarımdaki çizgisel dil: tek ağırlıkta stroke, yuvarlak uçlar,
 * araç büyüdükçe uzayan kasa ve artan aks sayısı.
 *
 * <p>Kasa solda, kabin sağda. Ön aks kabinin altına denk gelir. Van sınıfında kasa
 * kabinle aynı yükseklikte (tek gövde), kamyon sınıfında kasa daha alçak başlar.
 */

type Spec = {
  /** Kasanın bittiği x — kabin buradan başlar ve 6 birim yer kaplar (viewBox 32). */
  boxEnd: number;
  /** Kasa tavanı: van sınıfı tek gövde (6), kamyon sınıfı ayrı kasa (4.5). */
  top: number;
  axles: number[];
};

const SPECS: Record<string, Spec> = {
  MINI_PANELVAN: { boxEnd: 15, top: 6, axles: [6, 17] },
  PANELVAN: { boxEnd: 18, top: 6, axles: [6, 20] },
  MINIVAN: { boxEnd: 21, top: 6, axles: [6, 23] },
  KAMYONET: { boxEnd: 23, top: 4.5, axles: [6, 25] },
  KAMYON: { boxEnd: 25, top: 4.5, axles: [6, 19, 27] },
  TIR: { boxEnd: 26, top: 4.5, axles: [5, 9, 19, 23, 28] },
};

const FALLBACK: Spec = SPECS.KAMYONET;

export function VehicleGlyph({ code, className }: { code: string; className?: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const spec = SPECS[code] ?? FALLBACK;

  return (
    <svg viewBox="0 0 32 20" className={className} aria-hidden {...common}>
      {code === 'MOTOR' ? (
        <>
          <circle cx="6" cy="14" r="3.4" />
          <circle cx="25" cy="14" r="3.4" />
          <path d="M9.4 14h5.2l3-5.6h6.2" />
          <path d="M17.6 8.4 15 14M20.5 8.4h4.6l1.4 5.6" />
        </>
      ) : (
        <>
          {/* Kasa */}
          <path d={`M2 ${spec.top}h${spec.boxEnd - 2}v${15.4 - spec.top - 2.2}H2z`} />
          {/* Kabin */}
          <path d={`M${spec.boxEnd} 9h3.4l2.6 3v2.2H${spec.boxEnd}z`} />
          {/* Akslar */}
          {spec.axles.map((cx) => (
            <circle key={cx} cx={cx} cy="15.4" r="2.2" />
          ))}
        </>
      )}
    </svg>
  );
}
