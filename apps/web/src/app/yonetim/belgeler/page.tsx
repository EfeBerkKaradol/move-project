import type { ExpiringDocumentView } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import { OpsPage } from '@/components/ops/OpsShell';
import { DataTable, FilterTabs, Pill, type Column } from '@/components/ops/ui';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Belge süreleri' };

const WINDOWS = [
  { value: '7', label: '7 gün' },
  { value: '30', label: '30 gün' },
  { value: '90', label: '90 gün' },
];

export default async function OpsDocumentsPage({ searchParams }: { searchParams: Promise<{ gun?: string }> }) {
  const params = await searchParams;
  const days = WINDOWS.find((w) => w.value === params.gun)?.value ?? '30';
  const rows = await apiFetch<ExpiringDocumentView[]>(`/admin/carriers/expiring-documents?days=${days}`);

  const columns: Column<ExpiringDocumentView>[] = [
    {
      key: 'kalan', header: 'Kalan',
      cell: (d) => (
        <Pill tone={d.daysLeft <= 0 ? 'red' : d.daysLeft <= 7 ? 'red' : d.daysLeft <= 30 ? 'route' : 'neutral'}>
          {d.daysLeft <= 0 ? 'Doldu' : `${d.daysLeft} gün`}
        </Pill>
      ),
    },
    { key: 'tasiyici', header: 'Taşıyıcı', cell: (d) => <span className="font-semibold">{d.carrierName}</span> },
    { key: 'plaka', header: 'Plaka', hideOnMobile: true, secondary: true, cell: (d) => <span className="label-mono whitespace-nowrap">{d.plate}</span> },
    { key: 'belge', header: 'Belge', cell: (d) => d.kindDisplayName },
    { key: 'tarih', header: 'Son geçerlilik', cell: (d) => new Date(d.expiresOn).toLocaleDateString('tr-TR') },
  ];

  return (
    <OpsPage
      eyebrow="Operasyon"
      title="Belge süreleri"
      description="Süresi dolan belge taşıyıcıyı otomatik askıya alır. Önceden haber verirsen askı hiç gerekmez."
    >
      <FilterTabs items={WINDOWS} selected={days} hrefFor={(v) => `/yonetim/belgeler?gun=${v}`} />
      <div className="mt-6">
        <DataTable rows={rows} columns={columns}
          rowKey={(d) => `${d.carrierId}-${d.kind}`}
          rowHref={(d) => `/yonetim/basvurular/${d.carrierId}`}
          empty={`${days} gün içinde süresi dolacak belge yok.`} />
      </div>
    </OpsPage>
  );
}
