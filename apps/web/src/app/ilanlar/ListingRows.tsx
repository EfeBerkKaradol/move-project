import type { PublicListingView, VehicleType } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

/** "3 saat önce" — mutlak damga, yayının tazeliğini tek bakışta söylemiyor. */
function gecenSure(iso: string): string {
  const dakika = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (dakika < 1) return 'az önce';
  if (dakika < 60) return `${dakika} dk önce`;
  const saat = Math.round(dakika / 60);
  if (saat < 24) return `${saat} sa önce`;
  return `${Math.round(saat / 24)} gün önce`;
}

/**
 * İlan listesi — sıkı satırlar hâlinde.
 *
 * <p>Harita görünümündeki kartlar üç sütuna yayılıyor ve ekrana altı ilan
 * sığıyordu; yüz yetmiş dokuz ilanı öyle taramak mümkün değil. Burada her ilan
 * tek satır: rota, araç, büyüklük, tutar. Göz sütunları takip ediyor,
 * karşılaştırma kart kart kaydırmadan yapılıyor.
 *
 * <p>Satırın tamamı bağlantı — "İlanı aç" düğmesini aramak, tıklama hedefini
 * satırın yüzde onuna indiriyordu.
 */
export function ListingRows({
  listings,
  vehicles,
}: {
  listings: PublicListingView[];
  vehicles: VehicleType[];
}) {
  const aracAdi = (code: string) => vehicles.find((v) => v.code === code)?.displayName ?? code;

  return (
    <ul className="mt-6 overflow-hidden rounded-card border border-line bg-surface">
      {listings.map((l, i) => (
        <li key={l.id} id={`ilan-${l.id}`} className="scroll-mt-24">
          <Link
            href={`/ilanlar/${l.id}`}
            className={`group flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2 sm:gap-4 sm:px-5 ${
              i > 0 ? 'border-t border-line' : ''
            }`}
          >
            <span aria-hidden className="hidden shrink-0 text-[var(--route-deep)] sm:block">
              <Icon name="route" size={20} />
            </span>

            {/*
              Rota ve künye alt alta, tek esneyen sütunda. Yan yana konduklarında
              künye uzun olduğu için rota sıkışıp dört satıra kırılıyordu.
              min-w-0 şart: flex çocuğu varsayılan olarak içeriğinden dar olmuyor
              ve truncate çalışmıyor.
            */}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">
                {l.fromCity}, {l.fromDistrict}
                <span className="text-muted"> → </span>
                {l.toCity}, {l.toDistrict}
              </span>
              <span className="label-mono mt-1 block truncate text-muted">
                {aracAdi(l.vehicleTypeCode)} · {l.distanceKm} km · {l.pieceCount} parça
                {l.volumeM3 > 0 && ` · ${l.volumeM3.toLocaleString('tr-TR')} m³`}
              </span>
            </span>

            <span className="shrink-0 text-right">
              <span className="stat block leading-none">{formatPrice(String(l.estimatedAmount))}</span>
              <span className="label-mono mt-1 block text-muted">
                {l.offerCount > 0 ? `${l.offerCount} teklif` : 'teklif yok'} · {gecenSure(l.publishedAt)}
              </span>
            </span>

            <span
              aria-hidden
              className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-[var(--route-deep)]"
            >
              <Icon name="arrowRight" size={16} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
