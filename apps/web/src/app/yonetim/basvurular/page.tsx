import type { CarrierProfileView, CarrierStatus } from '@tasiyoruz/contracts';
import { CARRIER_STATUS_LABELS } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isOps } from '@/auth';
import { OpsNav } from '@/components/app/OpsNav';
import { Shell } from '@/components/app/Shell';
import { apiFetch } from '@/lib/api-server';
import { reactivateCarrier } from '../actions';
import { DocumentReview } from './DocumentReview';
import { ProfileDecision } from './ProfileDecision';

export const metadata: Metadata = { title: 'Taşıyıcı başvuruları' };
export const dynamic = 'force-dynamic';

const FILTERS: { value: CarrierStatus | 'HEPSI'; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'İncelenecek' },
  { value: 'APPROVED', label: 'Onaylı' },
  { value: 'SUSPENDED', label: 'Askıda' },
  { value: 'REJECTED', label: 'Reddedilen' },
  { value: 'DRAFT', label: 'Taslak' },
  { value: 'HEPSI', label: 'Hepsi' },
];

const TONE: Record<CarrierStatus, string> = {
  DRAFT: 'bg-surface-2 text-muted',
  PENDING_REVIEW: 'bg-[var(--amber-soft)] text-[#8a5c10]',
  APPROVED: 'bg-[#dff0e5] text-[#1f6b45]',
  REJECTED: 'bg-[#f7e0dd] text-[#8a2a1f]',
  SUSPENDED: 'bg-[#f7e0dd] text-[#8a2a1f]',
};

export default async function OpsCarriersPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (!canCallApi(session)) redirect('/giris');
  if (!isOps(session.roles)) redirect(homeFor(session.roles));

  const selected = FILTERS.find((f) => f.value === params.durum)?.value ?? 'PENDING_REVIEW';
  const query = selected === 'HEPSI' ? '' : `?status=${selected}`;
  const carriers = await apiFetch<CarrierProfileView[]>(`/admin/carriers${query}`);

  return (
    <Shell eyebrow="Operasyon" title="Taşıyıcı başvuruları">
      <OpsNav active="/yonetim/basvurular" />

      <nav aria-label="Durum süzgeci" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.value} href={`/yonetim/basvurular?durum=${f.value}`}
            aria-current={f.value === selected ? 'true' : undefined}
            className={`inline-flex min-h-11 items-center rounded-field border px-3.5 text-sm font-semibold transition ${
              f.value === selected
                ? 'border-amber bg-[var(--amber-soft)] text-[#8a5c10]'
                : 'border-line text-muted hover:border-muted hover:text-ink'
            }`}>
            {f.label}
          </Link>
        ))}
      </nav>

      {carriers.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-semibold">Bu durumda başvuru yok.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-6">
          {carriers.map((c) => (
            <li key={c.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-lg font-bold">{c.companyName ?? c.displayName}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[c.status]}`}>
                  {CARRIER_STATUS_LABELS[c.status]}
                </span>
                <span className="label-mono text-muted">{c.vehicleTypeCode} · {c.plate}</span>
                {c.phone && <span className="label-mono text-muted">{c.phone}</span>}
                {c.taxId && <span className="label-mono text-muted">VKN {c.taxId}</span>}
              </div>
              {c.companyName && <p className="mt-1 text-sm text-muted">Yetkili: {c.displayName}</p>}
              {c.reviewNote && <p className="mt-2 text-sm text-muted">Not: {c.reviewNote}</p>}
              {c.missingDocuments.length > 0 && (
                <p className="mt-2 text-sm text-[#8a5c10]">
                  Eksik belge: {c.missingDocuments.length}
                </p>
              )}

              {c.documents.length > 0 && (
                <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                  {c.documents.map((d) => <DocumentReview key={d.id} document={d} />)}
                </ul>
              )}

              {c.status === 'PENDING_REVIEW' && <ProfileDecision carrierId={c.carrierId} mode="review" />}
              {c.status === 'APPROVED' && <ProfileDecision carrierId={c.carrierId} mode="suspend" />}
              {c.status === 'SUSPENDED' && (
                <form action={async () => { 'use server'; await reactivateCarrier(c.carrierId); }}
                  className="mt-4 border-t border-line pt-4">
                  <button type="submit"
                    className="min-h-11 rounded-field bg-amber px-5 py-2.5 text-sm font-bold text-[var(--amber-ink)] transition hover:bg-[var(--amber-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px">
                    Askıyı kaldır
                  </button>
                  <p className="mt-2 text-xs text-muted">Belgeleri hâlâ geçerli değilse reddedilir.</p>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
