'use client';

/**
 * Hero'nun görsel tezi: alış noktasından teslim noktasına çizilen bir rota ve
 * üzerinde ilerleyen araç. Ürünün ne yaptığını tek bakışta anlatıyor —
 * dekoratif bir görsel değil.
 */
export function RouteAnimation() {
  // Rota uzunluğu stroke-dasharray animasyonu için gerekli; yol sabit olduğundan
  // ölçmek yerine yaklaşık değer yeterli (fazlası kesilir, eksiği görünür kalır).
  const ROUTE_LENGTH = 620;
  const path = 'M 24 156 C 96 156, 104 46, 176 46 S 268 150, 340 150 S 432 40, 496 40';

  return (
    <svg
      viewBox="0 0 520 200"
      className="w-full"
      role="img"
      aria-label="Alış noktasından teslim noktasına ilerleyen araç"
    >
      {/* Zemin ızgarası — harita hissi, dikkat çekmeden */}
      <defs>
        <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M 26 0 L 0 0 0 26" fill="none" stroke="var(--line)" strokeWidth="1" />
        </pattern>
        <linearGradient id="routeFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>

      <rect width="520" height="200" fill="url(#grid)" opacity="0.5" />

      {/* Rotanın soluk izi — hedefin nerede olduğunu baştan gösterir */}
      <path d={path} fill="none" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />

      {/* Çizilen rota */}
      <path
        d={path}
        fill="none"
        stroke="url(#routeFade)"
        strokeWidth="3"
        strokeLinecap="round"
        className="animate-route"
        style={{
          ['--route-length' as string]: ROUTE_LENGTH,
          strokeDasharray: ROUTE_LENGTH,
        }}
      />

      {/* Alış noktası — nabız halkası "burada araç aranıyor" hissi verir */}
      <g>
        <circle cx="24" cy="156" r="7" fill="var(--accent)" className="animate-ring" />
        <circle cx="24" cy="156" r="6" fill="var(--accent)" />
        <circle cx="24" cy="156" r="2.5" fill="var(--surface)" />
      </g>

      {/* Teslim noktası */}
      <g className="animate-pin" style={{ animationDelay: '1.9s', transformOrigin: '496px 40px' }}>
        <path
          d="M 496 26 a 9 9 0 0 1 9 9 c 0 6.5 -9 15 -9 15 s -9 -8.5 -9 -15 a 9 9 0 0 1 9 -9 z"
          fill="var(--primary)"
        />
        <circle cx="496" cy="35" r="3.2" fill="var(--surface)" />
      </g>

      {/* Rota üzerinde ilerleyen araç */}
      <g
        className="animate-truck"
        style={{ offsetPath: `path("${path}")`, offsetRotate: '0deg' }}
      >
        <rect x="-13" y="-9" width="26" height="18" rx="4" fill="var(--primary)" />
        <rect x="-9" y="-5.5" width="9" height="7" rx="1.5" fill="var(--surface)" opacity="0.85" />
        <circle cx="-6" cy="9" r="3" fill="var(--ink)" />
        <circle cx="7" cy="9" r="3" fill="var(--ink)" />
      </g>
    </svg>
  );
}
