import type { LegalDocumentView } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { LegalProse } from '@/components/legal/LegalProse';
import { getLegalDocuments } from '@/lib/api';
import { legalSlugs, readLegal } from '@/lib/legal';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await legalSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = (await getLegalDocuments()).find((d: LegalDocumentView) => d.slug === slug);
  if (!doc) return {};
  return {
    title: doc.title,
    description: `${doc.title} — ${doc.version} sürümü.`,
    alternates: { canonical: `/legal/${slug}` },
    robots: { index: true, follow: true },
  };
}

/**
 * Hukuki belge sayfası.
 *
 * <p>Metin depodan, künye (sürüm ve yürürlük tarihi) API'den geliyor. İkisinin
 * ayrı kaynaklardan gelmesi bilinçli: rıza kaydına yazılan sürüm ile sayfada
 * görünen sürüm aynı kayıttan okunuyor, "hangi metni kabul etti" sorusu tek
 * cevaplı kalıyor.
 */
export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [content, documents] = await Promise.all([readLegal(slug), getLegalDocuments()]);
  if (!content) notFound();

  const doc = documents.find((d: LegalDocumentView) => d.slug === slug);
  const others = documents.filter((d: LegalDocumentView) => d.slug !== slug);

  return (
    <>
      <Header />
      <main className="theme-cream min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-[46rem] px-6 py-12 md:py-16">
          <Link href="/legal"
            className="label-mono inline-flex min-h-11 items-center text-muted underline-offset-4 transition hover:text-ink hover:underline">
            ← Yasal belgeler
          </Link>

          <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.08]">
            {doc?.title ?? slug}
          </h1>

          {doc && (
            <p className="label-mono mt-3 text-muted">
              Sürüm {doc.version} · Yürürlük{' '}
              {new Date(doc.effectiveAt).toLocaleDateString('tr-TR', { dateStyle: 'long' })}
            </p>
          )}

          <article className="mt-8 text-[15px]">
            <LegalProse body={content.body} />
          </article>

          {others.length > 0 && (
            <nav aria-label="İlgili belgeler" className="mt-14 border-t border-line pt-8">
              <p className="label-mono text-muted">İlgili belgeler</p>
              <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                {others.map((d: LegalDocumentView) => (
                  <li key={d.slug}>
                    <Link href={`/legal/${d.slug}`}
                      className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 transition hover:text-[var(--route-deep)]">
                      {d.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
