import type { CarrierProfileView, ExpiringDocumentView, ListingView, OverviewView, TripView } from '@tasiyoruz/contracts';
import { CARRIER_STATUS_LABELS, TRIP_STAGE_LABELS } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { OpsPage } from '@/components/ops/OpsShell';
import { EmptyState, Pill, Section, StatCard, ago } from '@/components/ops/ui';
import { RouteLine } from '@/components/app/RouteLine';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Operasyon panosu' };

/** Teklif almadan bu kadar bekleyen ilan operasyonun dikkatini ister. */
const STALE_LISTING_HOURS = 2;

export default async function OpsOverviewPage() {
  const [o, pending, open, trips, expiring] = await Promise.all([
    apiFetch<OverviewView>('/admin/overview'),
    apiFetch<CarrierProfileView[]>('/admin/carriers?status=PENDING_REVIEW'),
    apiFetch<ListingView[]>('/admin/listings?status=OPEN'),
    apiFetch<TripView[]>('/admin/trips'),
    apiFetch<ExpiringDocumentView[]>('/admin/carriers/expiring-documents?days=30'),
  ]);

  const staleCutoff = Date.now() - STALE_LISTING_HOURS * 3_600_000;
  const stale = open.filter((l) => l.offerCount === 0 && new Date(l.publishedAt).getTime() < staleCutoff);
  const delivered = trips.filter((t) => t.stage === 'DELIVERED');
  const activeTrips = trips.filter((t) => t.stage !== 'COMPLETED');

  /** Dikkat kuyruğu: operasyonun bugün dokunması gereken her şey, tek listede. */
  const attention: { tone: 'amber' | 'red'; text: string; href: string; cta: string }[] = [
    ...pending.map((c) => ({
      tone: 'amber' as const,
      text: `${c.companyName ?? c.displayName} başvurusu inceleme bekliyor · ${c.vehicleTypeCode} · ${c.plate}`,
      href: `/yonetim/basvurular/${c.carrierId}`,
      cta: 'İncele',
    })),
    ...expiring.filter((d) => d.daysLeft <= 7).map((d) => ({
      tone: 'red' as const,
      text: `${d.carrierName} · ${d.kindDisplayName} ${d.daysLeft <= 0 ? 'süresi doldu' : `${d.daysLeft} gün içinde doluyor`}`,
      href: `/yonetim/basvurular/${d.carrierId}`,
      cta: 'Belgeye git',
    })),
    ...stale.map((l) => ({
      tone: 'amber' as const,
      text: `${l.listingNumber} ${ago(l.publishedAt)} yayınlandı, hâlâ teklif yok`,
      href: `/yonetim/ilanlar?durum=OPEN&q=${l.listingNumber}`,
      cta: 'İlana git',
    })),
    ...delivered.map((t) => ({
      tone: 'amber' as const,
      text: `${t.carrierDisplayName ?? 'Taşıyıcı'} teslimi bildirdi, müşteri onayı bekleniyor · ${formatPrice(t.agreedAmount.amount)}`,
      href: '/yonetim/isler',
      cta: 'İşe git',
    })),
  ];

  return (
    <OpsPage
      eyebrow="Operasyon"
      title="Pano"
      description="Sayılar canlı. Üstteki kuyruk bugün dokunulması gerekenleri sıralıyor."
    >
      <Section title={`Dikkat gerektirenler (${attention.length})`}>
        {attention.length === 0 ? (
          <EmptyState>Bekleyen bir şey yok. İyi iş.</EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
            {attention.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={`size-2 shrink-0 rounded-full ${a.tone === 'red' ? 'bg-[#c0392b]' : 'bg-amber'}`} aria-hidden />
                <span className="min-w-0 flex-1 text-sm">{a.text}</span>
                <Link href={a.href} className="inline-flex min-h-11 items-center rounded-field border border-line px-3 text-sm font-semibold transition hover:border-amber hover:bg-surface-2">
                  {a.cta}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Bugün">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="İncelenecek başvuru" value={o.carriersPendingReview}
            context={o.carriersPendingReview ? 'Onay bekleyen taşıyıcı' : 'Kuyruk boş'}
            href="/yonetim/basvurular?durum=PENDING_REVIEW" tone={o.carriersPendingReview ? 'amber' : 'neutral'} />
          <StatCard label="Açık ilan" value={o.openListings}
            context={`${o.listingsAwaitingOffer} tanesi henüz teklif almadı`}
            href="/yonetim/ilanlar?durum=OPEN" tone={stale.length ? 'amber' : 'neutral'} />
          <StatCard label="Devam eden iş" value={o.activeTrips}
            context={delivered.length ? `${delivered.length} tanesi müşteri onayı bekliyor` : 'Yolda ya da yükleniyor'}
            href="/yonetim/isler" />
          <StatCard label="Belge süresi yaklaşan" value={o.documentsExpiringSoon}
            context="30 gün içinde dolacak" href="/yonetim/belgeler"
            tone={expiring.some((d) => d.daysLeft <= 7) ? 'red' : o.documentsExpiringSoon ? 'amber' : 'neutral'} />
        </div>
      </Section>

      <Section title="Genel">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Onaylı taşıyıcı" value={o.approvedCarriers}
            context={o.suspendedCarriers ? `${o.suspendedCarriers} askıda` : 'Askıda taşıyıcı yok'}
            href="/yonetim/basvurular?durum=APPROVED" tone={o.suspendedCarriers ? 'red' : 'neutral'} />
          <StatCard label="Aktif koridor" value={o.activeCorridors} context="Boş dönüş eşleştirmeye açık" />
          <StatCard label="Tamamlanan iş" value={o.completedTrips} context="Teslimatta onaylanmış" href="/yonetim/isler" />
          <StatCard label="Tamamlanan hacim" value={formatPrice(o.completedVolume.amount)}
            context="Komisyonsuz dönemde ciro değil, hacim" />
        </div>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Son ilanlar" action={<Link href="/yonetim/ilanlar" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold underline underline-offset-4 hover:text-[#8a5c10]">Tümü</Link>}>
          {open.length === 0 ? <EmptyState>Açık ilan yok.</EmptyState> : (
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {open.slice(0, 5).map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <span className="label-mono text-muted">{l.listingNumber}</span>
                  <RouteLine l={l} />
                  <span className="ml-auto flex items-center gap-2">
                    <Pill tone={l.offerCount ? 'green' : 'neutral'}>{l.offerCount} teklif</Pill>
                    <span className="label-mono text-muted">{ago(l.publishedAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Devam eden işler" action={<Link href="/yonetim/isler" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold underline underline-offset-4 hover:text-[#8a5c10]">Tümü</Link>}>
          {activeTrips.length === 0 ? <EmptyState>Devam eden iş yok.</EmptyState> : (
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {activeTrips.slice(0, 5).map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <span className="text-sm font-semibold">{t.carrierDisplayName ?? 'Taşıyıcı'}</span>
                  <Pill tone={t.stage === 'DELIVERED' ? 'amber' : 'neutral'}>{TRIP_STAGE_LABELS[t.stage]}</Pill>
                  <span className="stat ml-auto text-sm">{formatPrice(t.agreedAmount.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {pending.length > 0 && (
        <Section title="Kuyruktaki başvurular" action={<Link href="/yonetim/basvurular" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold underline underline-offset-4 hover:text-[#8a5c10]">Tümü</Link>}>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pending.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/yonetim/basvurular/${c.carrierId}`}
                  className="block rounded-card border border-line bg-surface p-4 shadow-card transition hover:-translate-y-px hover:shadow-lift">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{c.companyName ?? c.displayName}</span>
                    <Pill tone="amber">{CARRIER_STATUS_LABELS[c.status]}</Pill>
                  </div>
                  <p className="label-mono mt-1 text-muted">{c.vehicleTypeCode} · {c.plate} · {c.documents.length} belge</p>
                  {c.submittedAt && <p className="mt-1 text-xs text-muted">{ago(c.submittedAt)} gönderildi</p>}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </OpsPage>
  );
}
