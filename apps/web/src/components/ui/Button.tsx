import Link from 'next/link';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

/**
 * Tek eylem stili. Birincil eylem lime (rota rengi) — kullanıcıyı ürünün çekirdek
 * fikrine götüren düğme ile "rota" görsel olarak aynı dili konuşuyor.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-route text-[var(--route-ink)] hover:bg-[var(--route-hover)] shadow-[0_1px_0_rgb(23_26_25/0.06)]',
  secondary:
    'border border-line bg-surface text-ink hover:border-ink/25 hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
};

const SIZES: Record<Size, string> = {
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-[15px]',
};

function classes(variant: Variant, size: Size, full?: boolean) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-field font-semibold',
    // 200ms sınırı: daha uzun geçiş düğmeyi ağır hissettiriyor
    'transition duration-150 active:translate-y-px',
    VARIANTS[variant],
    SIZES[size],
    full ? 'w-full' : '',
  ].join(' ');
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  full,
  hint,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  /** Düğmenin altında görünen ikinci satır — "Aracını bul." gibi. */
  hint?: string;
}) {
  const button = (
    <Link href={href} className={classes(variant, size, full)}>
      {children}
    </Link>
  );
  if (!hint) return button;
  // Alt metin düğmeden geniş olabilir; sarmalayıcı düğme genişliğine kilitlenirse
  // "Aracını bul." kırpılıyordu.
  return (
    <span className={`inline-flex flex-col items-start gap-2 ${full ? 'w-full' : ''}`}>
      {button}
      <span className="label-mono whitespace-nowrap text-muted">{hint}</span>
    </span>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  full,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}) {
  return (
    <button {...rest} className={classes(variant, size, full)}>
      {children}
    </button>
  );
}
