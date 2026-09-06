import type { OverviewView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isOps } from '@/auth';
import { OpsNav } from '@/components/app/OpsNav';
import { Shell } from '@/components/app/Shell';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Operasyon panosu' };
export const dynamic = 'force-dynamic';

export default async function OpsOverviewPage() {
  const session = await auth();
  if (!canCallApi(session)) redirect('/giris');
  if (!isOps(session.roles)) redirect(homeFor(session.roles));

  const o = await apiFetch<OverviewView>('/admin/overview');

  /** Dikkat isteyen sayılar vurgulu; sıfır olduğunda vurgusuz. */
  const cards: { label: string; value: string; href?: string; alert?: boolean }[] = [
    { label: 'İncelenecek başvuru', value: String(o.carriersPendingReview),
      href: '/yonetim/basvurular?durum=PENDING_REVIEW', alert: o.carriersPendingReview > 0 },
    { label: 'Teklif bekleyen ilan', value: String(o.listingsAwaitingOffer),
      href: '/yonetim/ilanlar?durum=OPEN', alert: o.listingsAwaitingOffer > 0 },
    { label: 'Askıdaki taşıyıcı', value: String(o.suspendedCarriers),
      href: '/yonetim/basvurular?durum=SUSPENDED', alert: o.suspendedCarriers > 0 },
    { label: 'Açık ilan', value: String(o.openListings), href: '/yonetim/ilanlar?durum=OPEN' },
    { label: 'Devam eden iş', value: String(o.activeTrips), href: '/yonetim/isler' },
    { label: 'Tamamlanan iş', value: String(o.completedTrips), href: '/yonetim/isler' },
    { label: 'Onaylı taşıyıcı', value: String(o.approvedCarriers),
      href: '/yonetim/basvurular?durum=APPROVED' },
    { label: 'Aktif koridor', value: String(o.activeCorridors) },
    { label: 'Tamamlanan hacim', value: formatPrice(o.completedVolume.amount) },
  ];

  return (
    <Shell eyebrow="Operasyon" title="Pano">
      <OpsNav active="/yonetim" />
      <p className="mt-4 max-w-2xl text-sm text-muted">
        Sayılar canlı. Vurgulu kutular işlem bekliyor.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const body = (
            <>
              <span className={`stat block text-3xl ${c.alert ? 'text-[#8a5c10]' : 'text-ink'}`}>
                {c.value}
              </span>
              <span className="label-mono mt-1 block text-muted">{c.label}</span>
            </>
          );
          return (
            <li key={c.label}
              className={`rounded-card border bg-surface p-5 ${c.alert ? 'border-amber' : 'border-line'}`}>
              {c.href
                ? <Link href={c.href} className="block rounded-field transition hover:opacity-80">{body}</Link>
                : body}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
