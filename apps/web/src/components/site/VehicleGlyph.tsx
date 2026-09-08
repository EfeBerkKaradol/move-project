/**
 * Araç ikonları.
 *
 * <p>Önceki set hepsini aynı kutu + kabin siluetiyle çiziyor, yalnızca kasa
 * uzunluğunu ve aks sayısını değiştiriyordu; 24 pikselde hiçbiri diğerinden
 * ayırt edilemiyordu. Bu sette her araç <strong>tipiyle</strong> ayrılıyor:
 * otomobilin eğimli tavanı, vanın tek gövdesi, kamyonetin kabinden ayrı kasası,
 * tırın mafsal boşluğu. Uzunluk ve teker sayısı yalnızca ikincil ipucu.
 */
const GLYPHS: Record<string, React.ReactNode> = {
  MOTOR: (
    <>
      <circle cx="6.5" cy="14" r="3.4" />
      <circle cx="24.5" cy="14" r="3.4" />
      <path d="M9.9 14h4.6l3.3-5.4h5.4" />
      <path d="M17.8 8.6 14.9 14M20.4 8.6h3.5l1.3 5.4" />
    </>
  ),

  OTOMOBIL: (
    <>
      {/* Eğimli tavan ve uzun kaput: bir bakışta binek araç */}
      <path d="M2.8 14.2v-2.1c0-.5.3-.9.8-1l2.5-.6 2.4-3.1c.3-.4.7-.6 1.2-.6h7.2c.4 0 .8.2 1.1.5l3 3.2 2.6.6c.5.1.9.5.9 1v2.1" />
      <path d="M6.1 10.5h15.8M12.6 6.8v3.7" />
      <circle cx="9" cy="14.6" r="2.2" />
      <circle cx="22.4" cy="14.6" r="2.2" />
    </>
  ),

  MINI_PANELVAN: (
    <>
      {/* Tek gövde, kısa kasa */}
      <path d="M3 6.5h9.6V15H3z" />
      <path d="M12.6 8.8h3l2.2 2.5V15h-5.2z" />
      <path d="M13.5 9.8h1.7l1.3 1.5h-3z" />
      <circle cx="6.6" cy="15" r="2.2" />
      <circle cx="16.2" cy="15" r="2.2" />
    </>
  ),

  PANELVAN: (
    <>
      {/* Aynı gövde dili, belirgin biçimde uzun; yan pencere ayracı ekli */}
      <path d="M2.6 5.5H16V15H2.6z" />
      <path d="M16 8.4h3.4l2.5 2.9V15H16z" />
      <path d="M16.9 9.4h2l1.5 1.8h-3.5z" />
      <path d="M7 5.5v3.1" />
      <circle cx="6.4" cy="15" r="2.2" />
      <circle cx="20" cy="15" r="2.2" />
    </>
  ),

  KAMYONET: (
    <>
      {/* Kasa kabinden AYRI — vandan ayıran esas işaret */}
      <path d="M2.6 7.4h10.8V15H2.6z" />
      <path d="M15.6 9h4l3 3.1V15h-7z" />
      <path d="M16.5 9.9h2.6l1.9 2h-4.5z" />
      <circle cx="6.6" cy="15" r="2.2" />
      <circle cx="19.6" cy="15" r="2.2" />
    </>
  ),

  KAMYON: (
    <>
      {/* Uzun kasa, çift arka aks */}
      <path d="M2.2 5.6h15V15h-15z" />
      <path d="M19 8.6h4.2l3.4 3.3V15H19z" />
      <path d="M19.9 9.5h2.8l2 2.1h-4.8z" />
      <circle cx="6.4" cy="15" r="2" />
      <circle cx="12.6" cy="15" r="2" />
      <circle cx="22.8" cy="15" r="2" />
    </>
  ),

  TIR: (
    <>
      {/* Mafsal boşluğu: dorse ile çekici ayrı gövdeler */}
      <path d="M1.6 4.8h14.8V15H1.6z" />
      <path d="M19.4 8.2h4l3.4 3.3V15h-7.4z" />
      <path d="M20.3 9.1h2.6l2 2.1h-4.6z" />
      <path d="M16.4 13.4h3" />
      <circle cx="5.4" cy="15" r="1.9" />
      <circle cx="10" cy="15" r="1.9" />
      <circle cx="14.6" cy="15" r="1.9" />
      <circle cx="23.2" cy="15" r="1.9" />
    </>
  ),
};

export function VehicleGlyph({ code, className }: { code: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 20"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Bilinmeyen bir kod gelirse kamyonet çizilir: filo büyürse ikonu
          eklenene kadar boş kutu değil, makul bir araç görünür. */}
      {GLYPHS[code] ?? GLYPHS.KAMYONET}
    </svg>
  );
}
