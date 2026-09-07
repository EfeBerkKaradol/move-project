import type { ListingStatus, ListingView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import { OpsPage } from '@/components/ops/OpsShell';
import { DataTable, FilterTabs, LISTING_TONE, Pill, SearchForm, ago, when, type Column } from '@/components/ops/ui';
import { apiFetch } from '@/lib/api-server';
import { CancelListing } from './CancelListing';

export const metadata: Metadata = { title: 'İlanlar' };

const FILTERS: { value: ListingStatus | 'HEPSI'; label: string }[] = [
  { value: 'OPEN', label: 'Açık' },
  { value: 'AWARDED', label: 'Taşıyıcı seçildi' },
  { value: 'EXPIRED', label: 'Süresi doldu' },
  { value: 'CANCELLED', label: 'İptal' },
  { value: 'HEPSI', label: 'Hepsi' },
];

const STATUS_LABEL: Record<ListingStatus, string> = {
  OPEN: 'Teklif topluyor', AWARDED: 'Taşıyıcı seçildi', EXPIRED: 'Süresi doldu', CANCELLED: 'İptal',
};

function matches(l: ListingView, q: string): boolean {
  const n = q.toLocaleLowerCase('tr-TR');
  const hay = [l.listingNumber, l.pickup.cityName, l.pickup.districtName, l.dropoff.cityName,
    l.dropoff.districtName, l.vehicleTypeCode, l.cargoDescription]
    .map((s) => (s ?? '').toLocaleLowerCase('tr-TR')).join(' ');
  return hay.includes(n);
}

export default async function OpsListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; q?: string }>;
}) {
  const params = await searchParams;
  const selected = FILTERS.find((f) => f.value === params.durum)?.value ?? 'OPEN';
  const q = (params.q ?? '').trim();
  const query = q || selected === 'HEPSI' ? '' : `?status=${selected}`;
  const all = await apiFetch<ListingView[]>(`/admin/listings${query}`);
  const rows = q ? all.filter((l) => matches(l, q)) : all;

  const columns: Column<ListingView>[] = [
    {
      key: 'no', header: 'İlan', className: 'min-w-[18rem]',
      cell: (l) => (
        <div>
          <p className="label-mono whitespace-nowrap text-muted">{l.listingNumber}</p>
          <p className="mt-1.5 font-semibold">
            {l.pickup.cityName}, {l.pickup.districtName} <span className="text-muted">→</span> {l.dropoff.cityName}, {l.dropoff.districtName}
          </p>
        </div>
      ),
    },
    { key: 'durum', header: 'Durum', cell: (l) => <Pill tone={LISTING_TONE[l.status]}>{STATUS_LABEL[l.status]}</Pill> },
    {
      key: 'arac', header: 'Araç · km', hideOnMobile: true, secondary: true,
      cell: (l) => <span className="label-mono whitespace-nowrap">{l.vehicleTypeCode} · {(l.estimate.distanceMeters / 1000).toFixed(0)} km</span>,
    },
    {
      key: 'teklif', header: 'Teklif', align: 'right',
      cell: (l) => <Pill tone={l.offerCount ? 'green' : l.status === 'OPEN' ? 'route' : 'neutral'}>{l.offerCount}</Pill>,
    },
    { key: 'tutar', header: 'Tarife', align: 'right', cell: (l) => <span className="stat whitespace-nowrap">{formatPrice(l.estimatedAmount.amount)}</span> },
    {
      key: 'zaman', header: 'Yayın', hideOnMobile: true, secondary: true,
      cell: (l) => (
        <div className="whitespace-nowrap text-muted">
          <p>{ago(l.publishedAt)}</p>
          {l.status === 'OPEN' && <p className="mt-1 text-xs">son {when(l.expiresAt)}</p>}
        </div>
      ),
    },
    {
      key: 'eylem', header: '', align: 'right',
      cell: (l) => l.status === 'OPEN' ? <CancelListing listingId={l.id} /> : null,
    },
  ];

  return (
    <OpsPage
      eyebrow="Operasyon"
      title="İlanlar"
      description="Açık ilanı gerekçe yazarak kapatabilirsin; bekleyen teklifler reddedilir."
      actions={<SearchForm placeholder="İlan no, il, ilçe, yük" value={q} hidden={{ durum: selected }} />}
    >
      <FilterTabs items={FILTERS} selected={q ? '' : selected} hrefFor={(v) => `/yonetim/ilanlar?durum=${v}`} />
      {q && <p className="mt-4 text-sm text-muted">&ldquo;{q}&rdquo; için {rows.length} sonuç, tüm durumlarda.</p>}
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} rowKey={(l) => l.id}
          empty={q ? 'Eşleşen ilan yok.' : 'Bu durumda ilan yok.'} />
      </div>
    </OpsPage>
  );
}
