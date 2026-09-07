import type { TripStage, TripView } from '@tasiyoruz/contracts';
import { TRIP_STAGE_LABELS } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import { OpsPage } from '@/components/ops/OpsShell';
import { DataTable, FilterTabs, Pill, SearchForm, ago, tripTone, when, type Column } from '@/components/ops/ui';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'İşler' };

type Filter = 'DEVAM' | 'ONAY_BEKLIYOR' | 'TAMAMLANAN' | 'HEPSI';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'DEVAM', label: 'Devam eden' },
  { value: 'ONAY_BEKLIYOR', label: 'Müşteri onayı bekliyor' },
  { value: 'TAMAMLANAN', label: 'Tamamlanan' },
  { value: 'HEPSI', label: 'Hepsi' },
];

function inFilter(t: TripView, f: Filter): boolean {
  if (f === 'HEPSI') return true;
  if (f === 'TAMAMLANAN') return t.stage === 'COMPLETED';
  if (f === 'ONAY_BEKLIYOR') return t.stage === 'DELIVERED';
  return t.stage !== 'COMPLETED' && t.stage !== 'DELIVERED';
}

/** Aşama ilerlemesi: 9 aşamadan kaçı geçildi. Operasyon tek bakışta "nerede" görsün. */
const STAGES: TripStage[] = ['DRIVER_ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'LOADING',
  'IN_TRANSIT', 'ARRIVED_AT_DROPOFF', 'UNLOADING', 'DELIVERED', 'COMPLETED'];

function Progress({ stage }: { stage: TripStage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5" aria-hidden>
        {STAGES.map((s, i) => (
          <span key={s} className={`h-1.5 w-2.5 rounded-sm ${i <= idx ? 'bg-amber' : 'bg-line'}`} />
        ))}
      </div>
      <span className="label-mono text-muted">{idx + 1}/{STAGES.length}</span>
    </div>
  );
}

export default async function OpsTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; q?: string }>;
}) {
  const params = await searchParams;
  const selected = FILTERS.find((f) => f.value === params.durum)?.value ?? 'DEVAM';
  const q = (params.q ?? '').trim().toLocaleLowerCase('tr-TR');
  const all = await apiFetch<TripView[]>('/admin/trips');
  const rows = all
    .filter((t) => q ? true : inFilter(t, selected))
    .filter((t) => !q || [t.carrierDisplayName, t.proofOfDelivery?.receivedByName]
      .some((s) => (s ?? '').toLocaleLowerCase('tr-TR').includes(q)));
  const counts = Object.fromEntries(FILTERS.map((f) => [f.value, all.filter((t) => inFilter(t, f.value)).length]));

  const columns: Column<TripView>[] = [
    {
      key: 'tasiyici', header: 'Taşıyıcı',
      cell: (t) => (
        <div>
          <p className="font-semibold">{t.carrierDisplayName ?? 'Taşıyıcı'}</p>
          <p className="text-xs text-muted">başladı {ago(t.startedAt)}</p>
        </div>
      ),
    },
    { key: 'asama', header: 'Aşama', cell: (t) => <Pill tone={tripTone(t.stage)}>{TRIP_STAGE_LABELS[t.stage]}</Pill> },
    { key: 'ilerleme', header: 'İlerleme', hideOnMobile: true, secondary: true, cell: (t) => <Progress stage={t.stage} /> },
    {
      key: 'kanit', header: 'Kanıt',
      cell: (t) => (
        <span className="text-sm">
          {t.photos.length} kare
          {t.proofOfDelivery ? <span className="text-muted"> · {t.proofOfDelivery.receivedByName}</span> : null}
        </span>
      ),
    },
    { key: 'tutar', header: 'Tutar', align: 'right', cell: (t) => <span className="stat whitespace-nowrap">{formatPrice(t.agreedAmount.amount)}</span> },
    {
      key: 'zaman', header: 'Teslim', hideOnMobile: true, secondary: true,
      cell: (t) => <span className="whitespace-nowrap text-muted">{t.deliveredAt ? when(t.deliveredAt) : '—'}</span>,
    },
  ];

  return (
    <OpsPage
      eyebrow="Operasyon"
      title="İşler"
      description="Teslimi bildirilen iş müşteri onayı bekler; gecikirse iki tarafı da aramak gerekir."
      actions={<SearchForm placeholder="Taşıyıcı, teslim alan" value={params.q ?? ''} hidden={{ durum: selected }} />}
    >
      <FilterTabs items={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))} selected={q ? '' : selected}
        hrefFor={(v) => `/yonetim/isler?durum=${v}`} />
      <div className="mt-4">
        <DataTable rows={rows} columns={columns} rowKey={(t) => t.id}
          empty={q ? 'Eşleşen iş yok.' : 'Bu durumda iş yok.'} />
      </div>
    </OpsPage>
  );
}
