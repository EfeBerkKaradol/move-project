import type { CarrierProfileView } from '@tasiyoruz/contracts';
import { CARRIER_STATUS_LABELS } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OpsPage } from '@/components/ops/OpsShell';
import { CARRIER_TONE, Pill, Section, when } from '@/components/ops/ui';
import { apiFetch } from '@/lib/api-server';
import { reactivateCarrier } from '../../actions';
import { DocumentReview } from '../DocumentReview';
import { ProfileDecision } from '../ProfileDecision';

export const metadata: Metadata = { title: 'Başvuru' };

export default async function OpsCarrierDetailPage({ params }: { params: Promise<{ carrierId: string }> }) {
  const { carrierId } = await params;
  // Tek kayıt ucu yok; liste küçük, süzmek yeterli. Büyüyünce uç eklenecek.
  const c = (await apiFetch<CarrierProfileView[]>('/admin/carriers')).find((x) => x.carrierId === carrierId);
  if (!c) notFound();

  const approved = c.documents.filter((d) => d.status === 'APPROVED').length;
  const pending = c.documents.filter((d) => d.status === 'PENDING').length;
  const allApproved = c.documents.length > 0 && approved === c.documents.length && c.missingDocuments.length === 0;

  return (
    <OpsPage
      eyebrow={<Link href="/yonetim/basvurular" className="hover:underline">← Başvurular</Link>}
      title={c.companyName ?? c.displayName}
      actions={<Pill tone={CARRIER_TONE[c.status]}>{CARRIER_STATUS_LABELS[c.status]}</Pill>}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <Section title={`Belgeler · ${approved}/${c.documents.length} onaylı${pending ? ` · ${pending} bekliyor` : ''}`}>
            {c.missingDocuments.length > 0 && (
              <p className="mb-5 rounded-field bg-[var(--amber-soft)] px-4 py-3 text-sm text-[#8a5c10]">
                Eksik belge: {c.missingDocuments.length}. Taşıyıcı yüklemeden başvuru incelemeye gelmez.
              </p>
            )}
            {c.documents.length === 0
              ? <p className="text-sm text-muted">Henüz belge yüklenmemiş.</p>
              : <ul className="grid gap-5 xl:grid-cols-2">{c.documents.map((d) => <DocumentReview key={d.id} document={d} />)}</ul>}
          </Section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-card border border-line bg-surface p-6 shadow-card">
            <p className="label-mono text-muted">Başvuru</p>
            <dl className="mt-5 space-y-3 text-sm">
              <Row k="Ad soyad" v={c.displayName} />
              {c.companyName && <Row k="Unvan" v={c.companyName} />}
              {c.taxId && <Row k="Vergi no" v={c.taxId} mono />}
              <Row k="Telefon" v={c.phone ?? '—'} mono />
              <Row k="Araç" v={c.vehicleTypeCode} mono />
              <Row k="Plaka" v={c.plate} mono />
              <Row k="Başvuru" v={when(c.createdAt)} />
              {c.submittedAt && <Row k="Gönderim" v={when(c.submittedAt)} />}
              {c.reviewedAt && <Row k="Karar" v={when(c.reviewedAt)} />}
            </dl>
            {c.reviewNote && (
              <p className="mt-5 rounded-field bg-surface-2 px-4 py-3 text-sm text-muted">Not: {c.reviewNote}</p>
            )}
          </div>

          <div className="rounded-card border border-line bg-surface p-6 shadow-card">
            <p className="label-mono text-muted">Karar</p>
            {c.status === 'PENDING_REVIEW' && (
              <>
                <p className="mt-3 text-sm text-muted">
                  {allApproved
                    ? 'Tüm belgeler onaylı; başvuru onaylanabilir.'
                    : 'Önce her belgeyi tek tek onayla; sunucu eksikle onaya izin vermez.'}
                </p>
                <ProfileDecision carrierId={c.carrierId} mode="review" />
              </>
            )}
            {c.status === 'APPROVED' && (
              <>
                <p className="mt-3 text-sm text-muted">Taşıyıcı iş alabiliyor. Askıya alırsan teklif veremez.</p>
                <ProfileDecision carrierId={c.carrierId} mode="suspend" />
              </>
            )}
            {c.status === 'SUSPENDED' && (
              <form action={async () => { 'use server'; await reactivateCarrier(c.carrierId); }} className="mt-3">
                <button type="submit"
                  className="min-h-11 w-full rounded-field bg-amber px-5 py-2.5 text-sm font-bold text-[var(--amber-ink)] transition hover:bg-[var(--amber-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px">
                  Askıyı kaldır
                </button>
                <p className="mt-2 text-xs text-muted">Belgeleri hâlâ geçerli değilse sunucu reddeder.</p>
              </form>
            )}
            {(c.status === 'DRAFT' || c.status === 'REJECTED') && (
              <p className="mt-3 text-sm text-muted">
                {c.status === 'DRAFT' ? 'Taşıyıcı henüz incelemeye göndermedi.' : 'Reddedildi; taşıyıcı düzeltip yeniden gönderebilir.'}
              </p>
            )}
          </div>
        </aside>
      </div>
    </OpsPage>
  );
}

function Row({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className={`text-right font-semibold ${mono ? 'label-mono' : ''}`}>{v}</dd>
    </div>
  );
}
