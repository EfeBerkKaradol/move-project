/**
 * Tek çizgi ikon seti.
 *
 * <p>Harici ikon kütüphanesi eklenmedi: proje şu ana kadar satır içi SVG kullanıyordu
 * ve tek bir stil (1.6 kalınlık, yuvarlak uç, 24 viewBox) için paket taşımak gereksiz
 * ağırlık. Hepsi buradan geldiği için stil karışması da mümkün değil.
 */
const PATHS = {
  arrowRight: <path d="M4 12h15M13.5 6.5 20 12l-6.5 5.5" />,
  arrowDown: <path d="M12 4.5v15M5.5 13l6.5 6.5L18.5 13" />,
  check: <path d="M5 12.5 10 17.5 19 6.5" />,
  pin: (
    <>
      <path d="M12 21.5s7-6.2 7-11.5a7 7 0 1 0-14 0c0 5.3 7 11.5 7 11.5Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  route: (
    <>
      <circle cx="5.5" cy="6" r="2.5" />
      <circle cx="18.5" cy="18" r="2.5" />
      <path d="M8 6h5.5A4.5 4.5 0 0 1 18 10.5v0a4.5 4.5 0 0 1-4.5 4.5H10.5A4.5 4.5 0 0 0 6 19.5" />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 6.5h11v9h-11zM13.5 10h3.6l2.9 3.2v2.3h-6.5z" />
      <circle cx="7" cy="17.5" r="2" />
      <circle cx="16.5" cy="17.5" r="2" />
    </>
  ),
  package: (
    <>
      <path d="M12 3.2 20.5 7.7v8.6L12 20.8 3.5 16.3V7.7z" />
      <path d="M3.5 7.7 12 12.2l8.5-4.5M12 12.2v8.6" />
    </>
  ),
  shield: <path d="M12 2.8 20 6v6.3c0 4.5-3.4 7.9-8 9.2-4.6-1.3-8-4.7-8-9.2V6z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.8V12l3.6 2.4" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8.5h3.5L8 6h8l1.5 2.5H21v10H3z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 2.8h12v18.4l-3-1.8-3 1.8-3-1.8-3 1.8z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </>
  ),
  handshake: (
    <>
      <path d="M3 9.5 7 6h4l2 1.8L15 6h4l2 3.5" />
      <path d="M13 7.8 9.6 11a1.8 1.8 0 0 0 2.5 2.6l1.4-1.2 3.3 3a1.7 1.7 0 0 1-2.4 2.4l-.7-.7" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: 16 | 20 | 24;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
