import type { LegalDocumentView } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { Icon } from '@/components/ui/Icon';
import { getLegalDocuments } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Yasal belgeler',
  description: 'Kullanıcı sözleşmesi, KVKK aydınlatma metni, yasaklı eşyalar ve diğer yasal belgeler.',
  alternates: { canonical: '/legal' },
};

export const revalidate = 3600;

/** Belgelerin okuma sırası: önce herkesi ilgilendirenler, sonra role özel olanlar. */
const GROUPS: { title: string; slugs: string[] }[] = [
  {
    title: 'Herkes için',
    slugs: ['kullanici-sozlesmesi', 'yasakli-esyalar', 'hukuka-aykiri-kullanim', 'ihlaller-ve-sikayetler'],
  },
  {
    title: 'Rolüne göre',
    slugs: ['gonderici-sozlesmesi', 'tasiyici-sozlesmesi', 'mesafeli-hizmet-sozlesmesi', 'iptal-iade'],
  },
  {
    title: 'Kişisel veriler',
    slugs: ['kvkk-aydinlatma', 'gizlilik', 'acik-riza', 'cerez-politikasi', 'ticari-ileti'],
  },
];

export default async function LegalIndexPage() {
  const documents = await getLegalDocuments();
  const bySlug = new Map(documents.map((d: LegalDocumentView) => [d.slug, d]));

  return (
    <>
      <Header />
      <main className="theme-cream min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-[62rem] px-6 py-12 md:py-16">
          <p className="label-mono text-[var(--route-deep)]">Yasal</p>
          <h1 className="mt-3 text-[clamp(1.9rem,4.5vw,2.9rem)] leading-[1.06]">
            Sözleşmeler ve politikalar.
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Her belgenin sürümü ve yürürlük tarihi üzerinde yazıyor. Esaslı bir değişiklik
            olduğunda yeniden kabul isteniyor.
          </p>

          {GROUPS.map((group) => {
            const docs = group.slugs.map((s) => bySlug.get(s)).filter((d) => d !== undefined);
            if (docs.length === 0) return null;
            return (
              <section key={group.title} className="mt-10">
                <h2 className="label-mono text-muted">{group.title}</h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {docs.map((doc) => (
                    <li key={doc.slug}>
                      <Link href={`/legal/${doc.slug}`}
                        className="flex h-full items-center gap-3 rounded-card border border-line bg-surface p-5 transition hover:border-[var(--route-deep)] hover:bg-surface-2">
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold">{doc.title}</span>
                          <span className="label-mono mt-0.5 block text-muted">Sürüm {doc.version}</span>
                        </span>
                        <span aria-hidden className="shrink-0 text-muted">
                          <Icon name="arrowRight" size={16} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
