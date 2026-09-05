import Link from 'next/link';
import { Footer } from './Footer';
import { Header } from './Header';

/**
 * Henüz yapılmamış sayfalar için iskelet. Ana sayfadaki her CTA bir yere çıkmalı;
 * 404 yerine ne geleceğini ve ne zaman geleceğini söyleyen tek ekran.
 *
 * <p>Sahte içerik yok: yasal metinler hazırlanmadıysa "hazırlanıyor" yazar,
 * uydurma bir sözleşme metni konmaz.
 */
export function PlaceholderPage({
  eyebrow,
  title,
  children,
  cta,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  cta?: { href: string; label: string };
}) {
  return (
    <>
      <Header />
      <main className="theme-dark min-h-[60vh] bg-bg">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="label-mono text-amber">{eyebrow}</p>
          <h1 className="mt-4 text-[clamp(2rem,5.5vw,2.8rem)] leading-[1.06]">{title}</h1>
          <div className="mt-6 max-w-lg space-y-4 text-muted">{children}</div>
          {cta && (
            <Link
              href={cta.href}
              className="mt-9 inline-block rounded-field bg-amber px-5 py-3.5 text-sm font-bold text-[var(--amber-ink)] transition hover:brightness-105"
            >
              {cta.label}
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
