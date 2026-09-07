/**
 * Marka işareti: rota çizgisi + düğümler.
 *
 * <p>Karınca metaforu figüratif değil yapısal — küçük noktaların bir hat üzerinde
 * birleşip tek bir sistem oluşturması. Böcek çizimi yok; kolektif hareket var.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden fill="none">
      <path
        d="M4 20.5c3.4 0 4.6-5.2 8-5.2s4.6 5.2 8 5.2"
        stroke="var(--route)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <circle cx="4" cy="20.5" r="2.6" fill="var(--route)" />
      <circle cx="12" cy="15.3" r="2.2" fill="currentColor" />
      <circle cx="20" cy="20.5" r="2.6" fill="var(--route)" />
      <circle cx="16.4" cy="8.4" r="1.7" fill="currentColor" opacity="0.45" />
      <circle cx="23.4" cy="11.4" r="1.4" fill="currentColor" opacity="0.28" />
    </svg>
  );
}
