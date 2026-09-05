import type { ListingStatus, OfferStatus } from '@tasiyoruz/contracts';

const LABELS: Record<ListingStatus | OfferStatus, [string, string]> = {
  OPEN: ['Teklif topluyor', 'bg-[var(--amber-soft)] text-[#8a5c10]'],
  AWARDED: ['Taşıyıcı seçildi', 'bg-[#e2f4ea] text-[#1f6b45]'],
  EXPIRED: ['Süresi doldu', 'bg-surface-2 text-muted'],
  CANCELLED: ['İptal', 'bg-surface-2 text-muted'],
  SUBMITTED: ['Bekliyor', 'bg-[var(--amber-soft)] text-[#8a5c10]'],
  ACCEPTED: ['Kabul edildi', 'bg-[#e2f4ea] text-[#1f6b45]'],
  REJECTED: ['Reddedildi', 'bg-surface-2 text-muted'],
  WITHDRAWN: ['Geri çekildi', 'bg-surface-2 text-muted'],
};

export function StatusPill({ status }: { status: ListingStatus | OfferStatus }) {
  const [label, cls] = LABELS[status];
  return <span className={`label-mono inline-block rounded px-2 py-1 ${cls}`}>{label}</span>;
}
