import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';

/** Uygulama sayfaları: krem tema, dar içerik. */
export function Shell({ children, eyebrow, title }: { children: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <>
      <Header />
      <main className="theme-cream min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <p className="label-mono text-[#8a5c10]">{eyebrow}</p>
          <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.06]">{title}</h1>
          <div className="mt-8">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
