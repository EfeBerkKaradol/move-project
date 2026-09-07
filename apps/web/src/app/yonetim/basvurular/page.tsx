import type { CarrierProfileView, CarrierStatus } from '@tasiyoruz/contracts';
import { CARRIER_STATUS_LABELS } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import { OpsPage } from '@/components/ops/OpsShell';
import { CARRIER_TONE, DataTable, FilterTabs, Pill, SearchForm, ago, type Column } from '@/components/ops/ui';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Taşıyıcı başvuruları' };

const FILTERS: { value: CarrierStatus | 'HEPSI'; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'İncelenecek' },
  { value: 'APPROVED', label: 'Onaylı' },
  { value: 'SUSPENDED', label: 'Askıda' },
  { value: 'REJECTED', label: 'Reddedilen' },
  { value: 'DRAFT', label: 'Taslak' },
  { value: 'HEPSI', label: 'Hepsi' },
];

/** Ad, unvan, plaka ve telefonda arar; Türkçe harfe duyarsız. */
function matches(c: CarrierProfileView, q: string): boolean {
  const n = (s: string | null) => (s ?? '').toLocaleLowerCase('tr-TR');
  const needle = q.toLocaleLowerCase('tr-TR');
  return [c.displayName, c.companyName, c.plate, c.phone, c.taxId].some((f) => n(f).includes(needle));
}

export default async function OpsCarriersPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; q?: string }>;
}) {
  const params = await searchParams;
  const selected = FILTERS.find((f) => f.value === params.durum)?.value ?? 'PENDING_REVIEW';
  const q = (params.q ?? '').trim();
  // Arama varsa tüm durumlarda aranır; kullanıcı plakayı yazıp süzgeçle uğraşmasın
  const query = q || selected === 'HEPSI' ? '' : `?status=${selected}`;
  const all = await apiFetch<CarrierProfileView[]>(`/admin/carriers${query}`);
  const rows = q ? all.filter((c) => matches(c, q)) : all;

  const columns: Column<CarrierProfileView>[] = [
    {
      key: 'ad', header: 'Taşıyıcı', className: 'min-w-[14rem]',
      cell: (c) => (
        <div>
          <p className="font-semibold">{c.companyName ?? c.displayName}</p>
          {c.companyName && <p className="mt-1 text-xs text-muted">Yetkili: {c.displayName}</p>}
        </div>
      ),
    },
    { key: 'arac', header: 'Araç', cell: (c) => <span className="label-mono whitespace-nowrap">{c.vehicleTypeCode} · {c.plate}</span> },
    { key: 'durum', header: 'Durum', cell: (c) => <Pill tone={CARRIER_TONE[c.status]}>{CARRIER_STATUS_LABELS[c.status]}</Pill> },
    {
      key: 'belge', header: 'Belgeler',
      cell: (c) => {
        const onayli = c.documents.filter((d) => d.status === 'APPROVED').length;
        const red = c.documents.filter((d) => d.status === 'REJECTED').length;
        return (
          <span className="text-sm">
            {onayli}/{c.documents.length} onaylı
            {red ? <span className="text-[#8a2a1f]"> · {red} red</span> : null}
            {c.missingDocuments.length ? <span className="text-[var(--route-deep)]"> · {c.missingDocuments.length} eksik</span> : null}
          </span>
        );
      },
    },
    {
      key: 'zaman', header: 'Gönderim', hideOnMobile: true, secondary: true,
      cell: (c) => <span className="text-muted">{c.submittedAt ? ago(c.submittedAt) : '—'}</span>,
    },
  ];

  return (
    <OpsPage
      eyebrow="Operasyon"
      title="Taşıyıcı başvuruları"
      description="Satıra tıkla; belgeleri gör, onayla ya da gerekçeyle reddet."
      actions={<SearchForm placeholder="Ad, unvan, plaka, telefon" value={q} hidden={{ durum: selected }} />}
    >
      <FilterTabs items={FILTERS} selected={q ? '' : selected}
        hrefFor={(v) => `/yonetim/basvurular?durum=${v}`} />
      {q && (
        <p className="mt-4 text-sm text-muted">
          &ldquo;{q}&rdquo; için {rows.length} sonuç, tüm durumlarda.
        </p>
      )}
      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(c) => c.id}
          rowHref={(c) => `/yonetim/basvurular/${c.carrierId}`}
          empty={q ? 'Eşleşen başvuru yok.' : 'Bu durumda başvuru yok.'}
        />
      </div>
    </OpsPage>
  );
}
