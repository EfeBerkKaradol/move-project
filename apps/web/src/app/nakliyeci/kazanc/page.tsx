import { type TripView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isDriver } from '@/auth';
import { Shell } from '@/components/app/Shell';
import { SubNav } from '@/components/app/SubNav';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Kazançlarım' };
export const dynamic = 'force-dynamic';

/** "2026-09" — aya göre gruplama anahtarı; yerel saate göre, kullanıcının ayı bu. */
function ayAnahtari(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ayAdi(anahtar: string): string {
  const [y, m] = anahtar.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

const topla = (trips: TripView[]) =>
  trips.reduce((t, x) => t + Number(x.agreedAmount.amount), 0);

/**
 * Araç sahibinin kazancı.
 *
 * <p>Rakamlar <strong>tamamlanmış</strong> işlerin anlaşılan tutarlarından
 * geliyor; uydurma yok, tahmin yok. Devam eden iş ayrı gösteriliyor çünkü
 * kazanılmış değil: teslim edilip onaylanana kadar tutar değişebilir.
 *
 * <p><strong>Hakediş burada değil.</strong> Ödeme akışı (yetkilendirme, serbest
 * bırakma, iade) henüz bağlı değil; "ödendi" demek olmayan bir şeyi olmuş gibi
 * göstermek olurdu. Platform komisyonu gerçek ve şu an sıfır — tarifeden
 * okunuyor, buraya sabit yazılmadı.
 */
export default async function DriverEarningsPage() {
  const session = await auth();
  if (!canCallApi(session)) redirect('/giris');
  if (!isDriver(session.roles)) redirect(homeFor(session.roles));

  const trips = await apiFetch<TripView[]>('/driver/trips');
  const tamamlanan = trips.filter((t) => t.stage === 'COMPLETED' && t.completedAt);
  const suren = trips.filter((t) => t.stage !== 'COMPLETED');

  const simdi = new Date();
  const buAy = `${simdi.getFullYear()}-${String(simdi.getMonth() + 1).padStart(2, '0')}`;
  const buAyinIsleri = tamamlanan.filter((t) => ayAnahtari(t.completedAt!) === buAy);

  // Aylara göre, en yeni önce
  const aylar = new Map<string, TripView[]>();
  for (const t of tamamlanan) {
    const k = ayAnahtari(t.completedAt!);
    aylar.set(k, [...(aylar.get(k) ?? []), t]);
  }
  const sirali = [...aylar.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const ozet: { etiket: string; deger: string; not: string }[] = [
    {
      etiket: 'Bu ay',
      deger: formatPrice(String(topla(buAyinIsleri))),
      not: `${buAyinIsleri.length} tamamlanan iş`,
    },
    {
      etiket: 'Toplam',
      deger: formatPrice(String(topla(tamamlanan))),
      not: `${tamamlanan.length} tamamlanan iş`,
    },
    {
      etiket: 'Süren işler',
      deger: formatPrice(String(topla(suren))),
      not: `${suren.length} iş · henüz kazanılmadı`,
    },
  ];

  return (
    <Shell eyebrow="Araç sahibi" title="Kazançlarım">
      <SubNav
        items={[
          { href: '/nakliyeci', label: 'Açık ilanlar' },
          { href: '/nakliyeci/koridor', label: 'Boş dönüş' },
          { href: '/nakliyeci/isler', label: 'İşlerim' },
          { href: '/nakliyeci/teklifler', label: 'Tekliflerim' },
        ]}
        className="-ml-3"
      />

      {tamamlanan.length === 0 && suren.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-semibold">Henüz kazanç yok.</p>
          <p className="mt-1 text-sm text-muted">
            İlk işini aldığında tutarlar burada birikmeye başlar.
          </p>
          <Link
            href="/nakliyeci"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-field bg-route px-5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] active:translate-y-px"
          >
            Açık ilanlara bak
          </Link>
        </div>
      ) : (
        <>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {ozet.map((o) => (
              <div key={o.etiket} className="rounded-card border border-line bg-surface p-5">
                <dt className="label-mono text-muted">{o.etiket}</dt>
                <dd className="stat mt-2 text-[1.75rem] leading-none">{o.deger}</dd>
                <p className="label-mono mt-2 text-muted">{o.not}</p>
              </div>
            ))}
          </dl>

          {/*
            Hakediş burada yok ve olmadığı açıkça yazıyor. Ödeme akışı bağlı
            değilken "ödendi" göstermek, olmayan bir şeyi olmuş gibi sunmak olurdu.
          */}
          <p className="mt-3 text-sm text-muted">
            Tutarlar anlaşılan taşıma bedelidir. Platform komisyonu şu an %0.
            Ödeme ve hakediş akışı bağlandığında ödenen/bekleyen ayrımı bu sayfada
            görünecek.
          </p>

          {sirali.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">Aya göre</h2>
              <ul className="mt-3 overflow-hidden rounded-card border border-line bg-surface">
                {sirali.map(([anahtar, isler], i) => (
                  <li
                    key={anahtar}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 ${
                      i > 0 ? 'border-t border-line' : ''
                    }`}
                  >
                    <span className="font-semibold">{ayAdi(anahtar)}</span>
                    <span className="label-mono text-muted">{isler.length} iş</span>
                    <span className="stat ml-auto text-base">
                      {formatPrice(String(topla(isler)))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Shell>
  );
}
