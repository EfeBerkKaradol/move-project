import type { NotificationView } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import { OpsPage } from '@/components/ops/OpsShell';
import { DataTable, FilterTabs, Pill, when, type Column } from '@/components/ops/ui';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Bildirimler' };

const KIND_LABELS: Record<string, string> = {
  OFFER_RECEIVED: 'Yeni teklif',
  OFFER_ACCEPTED: 'Teklif kabul',
  CARRIER_ASSIGNED: 'Taşıyıcı atandı',
  LISTING_EXPIRED: 'İlan süresi doldu',
  DELIVERY_REPORTED: 'Teslim bildirildi',
  TRIP_COMPLETED: 'İş tamamlandı',
  RATE_CARRIER: 'Puanlama daveti',
  CARRIER_APPROVED: 'Başvuru onayı',
  CARRIER_REJECTED: 'Başvuru reddi',
  DOCUMENT_REJECTED: 'Belge reddi',
  CARRIER_SUSPENDED: 'Askıya alma',
  DOCUMENT_EXPIRING: 'Belge süresi uyarısı',
};

const FILTERS = [
  { value: 'HEPSI', label: 'Hepsi' },
  { value: 'FAILED', label: 'Gitmeyen' },
  { value: 'SKIPPED', label: 'Atlanan' },
  { value: 'SENT', label: 'Gönderilen' },
];

export default async function OpsNotificationsPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const params = await searchParams;
  const selected = FILTERS.find((f) => f.value === params.durum)?.value ?? 'HEPSI';
  const all = await apiFetch<NotificationView[]>('/admin/notifications?limit=200');
  const rows = selected === 'HEPSI' ? all : all.filter((n) => n.status === selected);
  const counts = Object.fromEntries(FILTERS.map((f) => [f.value, f.value === 'HEPSI' ? all.length : all.filter((n) => n.status === f.value).length]));

  const columns: Column<NotificationView>[] = [
    { key: 'zaman', header: 'Zaman', cell: (n) => <span className="whitespace-nowrap text-muted">{when(n.createdAt)}</span> },
    { key: 'tur', header: 'Tür', cell: (n) => <span className="font-semibold">{KIND_LABELS[n.kind] ?? n.kind}</span> },
    { key: 'alici', header: 'Alıcı', cell: (n) => <span className="label-mono">{n.recipient ?? n.recipientId.slice(0, 8) + '…'}</span> },
    { key: 'konu', header: 'Konu', hideOnMobile: true, secondary: true, cell: (n) => <span className="text-muted">{n.subject}</span> },
    {
      key: 'durum', header: 'Durum',
      cell: (n) => (
        <div>
          <Pill tone={n.status === 'SENT' ? 'green' : n.status === 'FAILED' ? 'red' : 'neutral'}>
            {n.status === 'SENT' ? 'Gönderildi' : n.status === 'FAILED' ? 'Gitmedi' : 'Atlandı'}
          </Pill>
          {n.error && <p className="mt-1 max-w-xs text-xs text-[#8a2a1f]">{n.error}</p>}
        </div>
      ),
    },
  ];

  return (
    <OpsPage
      eyebrow="Operasyon"
      title="Bildirimler"
      description="Gönderilen e-postaların izi. Gitmeyenlerde hata metni satırda; atlananlarda alıcının e-postası çözülememiş demektir."
    >
      <FilterTabs items={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))} selected={selected}
        hrefFor={(v) => `/yonetim/bildirimler?durum=${v}`} />
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} rowKey={(n) => n.id} empty="Bu durumda bildirim yok." />
      </div>
    </OpsPage>
  );
}
