import type { CorridorMatchView, CorridorView, District, VehicleType } from '@tasiyoruz/contracts';
import { CORRIDOR_STATUS_LABELS } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isDriver } from '@/auth';
import { RouteLine } from '@/components/app/RouteLine';
import { Shell } from '@/components/app/Shell';
import { SubNav } from '@/components/app/SubNav';
import { apiFetch } from '@/lib/api-server';
import { getDistricts, getVehicleTypes } from '@/lib/api';
import { OfferForm } from '../OfferForm';
import { CorridorForm } from './CorridorForm';
import { deleteCorridor, ignoreMatch, setCorridorPaused } from './actions';

export const metadata: Metadata = { title: 'Boş dönüş' };
export const dynamic = 'force-dynamic';

/**
 * İl başına tek temsilci ilçe. Üç ilde gerçek ilçe verisi var, kalan 78'de
 * "Merkez" (V8). Koridor il düzeyinde tanımlandığı için temsilci yeterli.
 */
function provinceChoices(districts: District[]): District[] {
  const byCity = new Map<string, District>();
  for (const d of districts) {
    const current = byCity.get(d.cityCode);
    if (!current || (d.slug === 'merkez' && current.slug !== 'merkez')) byCity.set(d.cityCode, d);
  }
  return [...byCity.values()].sort((a, b) => a.cityName.localeCompare(b.cityName, 'tr'));
}

export default async function CorridorPage() {
  const session = await auth();
  if (!canCallApi(session)) redirect('/giris');
  if (!isDriver(session.roles)) redirect(homeFor(session.roles));

  const [corridors, matches, districts, fleet] = await Promise.all([
    apiFetch<CorridorView[]>('/driver/corridors'),
    apiFetch<CorridorMatchView[]>('/driver/corridors/matches'),
    getDistricts(),
    getVehicleTypes(),
  ]);
  // getDistricts API'ye ulaşamazsa null döner; sayfa çökmek yerine formu kapatıp
  // durumu söylüyor — koridor listesi ve eşleşmeler yine görünüyor.
  const cities = provinceChoices(districts ?? []);
  const vehicles = fleet.filter((v: VehicleType) => v.active);

  return (
    <Shell eyebrow="Araç sahibi" title="Boş dönüş">
      <SubNav
        items={[
            { href: '/nakliyeci', label: 'Açık ilanlar' },
            { href: '/nakliyeci/isler', label: 'İşlerim' },
            { href: '/nakliyeci/teklifler', label: 'Tekliflerim' },
            { href: '/nakliyeci/kazanc', label: 'Kazançlarım' },
            { href: '/sofor-ol', label: 'Belgelerim' },
          ]}
        className="-ml-3"
      />

      <p className="mt-4 max-w-2xl text-sm text-muted">
        Yükünü bıraktığın şehirden dönerken boş gitme. Dönüş rotanı kaydet, o rotaya düşen
        ilanlar burada listelensin. Her ilanın yanında rotanı kaç kilometre uzattığı yazıyor.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Eşleşen ilanlar</h2>
        {matches.length === 0 ? (
          <div className="mt-3 rounded-card border border-dashed border-line p-8 text-center">
            <p className="font-semibold">Rotana düşen açık ilan yok.</p>
            <p className="mt-1 text-sm text-muted">
              {corridors.length === 0
                ? 'Aşağıdan ilk koridorunu tanımla.'
                : 'Yeni bir ilan yayınlandığında rotana uyuyorsa burada görünür.'}
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-4">
            {matches.map((m) => (
              <li key={m.id} className="rounded-card border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="label-mono text-muted">{m.listing.listingNumber}</span>
                  <RouteLine l={m.listing} />
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold tabular-nums">
                    +{m.detourKm.toFixed(0)} km sapma
                  </span>
                  <span className="ml-auto text-sm text-muted">
                    tarife tahmini <span className="stat text-ink">{formatPrice(m.listing.estimatedAmount.amount)}</span>
                  </span>
                </div>
                {m.listing.cargoDescription && <p className="mt-2 text-sm">{m.listing.cargoDescription}</p>}
                <p className="label-mono mt-1 text-muted">
                  {m.listing.vehicleTypeCode} · {m.listing.offerCount} teklif ·{' '}
                  {new Date(m.listing.expiresAt).toLocaleString('tr-TR')} tarihine kadar açık
                </p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
                  <OfferForm listingId={m.listing.id} suggested={Number(m.listing.estimatedAmount.amount).toFixed(0)} />
                  <form action={async () => { 'use server'; await ignoreMatch(m.id); }}>
                    <button type="submit"
                      className="min-h-11 rounded-field border border-line px-3 py-2.5 text-sm font-semibold transition hover:border-route hover:bg-surface-2">
                      İlgilenmiyorum
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Koridorlarım</h2>
        {corridors.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Henüz koridor tanımlamadın.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
            {corridors.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
                <span className="font-semibold">
                  {c.origin.cityName} <span className="text-muted">→</span> {c.destination.cityName}
                </span>
                <span className="label-mono text-muted">
                  {c.vehicleTypeCode} · en fazla {c.detourToleranceKm} km sapma
                  {c.minAmount ? ` · alt sınır ${formatPrice(c.minAmount.amount)}` : ''}
                </span>
                <span className="label-mono text-muted">
                  {new Date(c.departureFrom).toLocaleString('tr-TR')} – {new Date(c.departureTo).toLocaleString('tr-TR')}
                </span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">
                  {CORRIDOR_STATUS_LABELS[c.status]}
                </span>
                {c.pendingMatchCount > 0 && (
                  <span className="rounded-full bg-route px-2.5 py-1 text-xs font-bold text-[var(--route-ink)] tabular-nums">
                    {c.pendingMatchCount} ilan
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  {c.status !== 'EXPIRED' && (
                    <form action={async () => { 'use server'; await setCorridorPaused(c.id, c.status === 'ACTIVE'); }}>
                      <button type="submit"
                        className="min-h-11 rounded-field border border-line px-3 py-2.5 text-sm font-semibold transition hover:border-route hover:bg-surface-2">
                        {c.status === 'ACTIVE' ? 'Duraklat' : 'Sürdür'}
                      </button>
                    </form>
                  )}
                  <form action={async () => { 'use server'; await deleteCorridor(c.id); }}>
                    <button type="submit"
                      className="min-h-11 rounded-field border border-line px-3 py-2.5 text-sm font-semibold text-muted transition hover:border-[#8a2a1f] hover:text-[#8a2a1f]">
                      Sil
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-card border border-line bg-surface p-6">
        <h2 className="text-lg font-bold">Yeni koridor</h2>
        <p className="mt-1 text-sm text-muted">Dönüş rotanı ve ne kadar sapabileceğini yaz.</p>
        {cities.length === 0 ? (
          <p className="mt-4 text-sm text-[#8a2a1f]">İl listesi şu an yüklenemedi, birazdan tekrar dene.</p>
        ) : (
          <div className="mt-5">
            <CorridorForm cities={cities} vehicles={vehicles} />
          </div>
        )}
      </section>
    </Shell>
  );
}
