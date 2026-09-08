'use client';

import { useMemo, useState } from 'react';
import { MAP_VIEWBOX, TURKEY_PATH, projectLonLat } from '@/components/hero/geo-data';

export type MapListing = {
  id: string;
  listingNumber: string;
  vehicleTypeCode: string;
  fromLabel: string;
  toLabel: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  km: number;
};

/**
 * Açık ilanların haritası.
 *
 * <p>Liste tek başına "bu yük bana yakın mı?" sorusunu cevaplamıyordu: taşıyıcı
 * ilçe adlarını okuyup kafasında haritaya oturtmak zorundaydı. Rotalar ülke
 * üzerinde çizilince hangi ilanın kendi koridoruna düştüğü tek bakışta görünüyor.
 *
 * <p>Aynı gerçek sınır verisi ve projeksiyon hero sahnesiyle paylaşılıyor
 * (geo-data.ts); ilçe koordinatları API'den geldiği için çalışma anında
 * projekte ediliyor.
 */
export function ListingsMap({ listings }: { listings: MapListing[] }) {
  const [active, setActive] = useState<string | null>(null);

  const routes = useMemo(
    () =>
      listings.map((listing) => {
        const a = projectLonLat(listing.from.lng, listing.from.lat);
        const b = projectLonLat(listing.to.lng, listing.to.lat);
        // Hafif yay: aynı iki ilçe arasındaki birden çok ilan üst üste binmesin
        // diye de yön veriyor, düz çizgi hepsini tek çizgiye indiriyordu.
        const bend = 0.16;
        const mx = (a.x + b.x) / 2 + (b.y - a.y) * bend;
        const my = (a.y + b.y) / 2 - (b.x - a.x) * bend;
        return { listing, a, b, d: `M${a.x} ${a.y}Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x} ${b.y}` };
      }),
    [listings],
  );

  if (routes.length === 0) return null;

  const activeRoute = routes.find((r) => r.listing.id === active);

  return (
    <figure className="relative overflow-hidden rounded-card border border-line bg-surface">
      <svg viewBox={MAP_VIEWBOX} className="block w-full" role="img"
        aria-label={`${listings.length} açık ilanın rotaları Türkiye haritası üzerinde`}>
        <path d={TURKEY_PATH} fill="var(--surface-2)" stroke="var(--line)" strokeWidth={1.2}
          strokeLinejoin="round" />

        {routes.map(({ listing, a, b, d }) => {
          const on = active === listing.id;
          return (
            <g key={listing.id}>
              {/* Görünen çizgi ince; tıklama/hover hedefi kalın ve saydam —
                  2 piksellik bir yolu fareyle yakalamak mümkün değil. */}
              <path d={d} fill="none" stroke={on ? 'var(--route-deep)' : 'var(--muted)'}
                strokeOpacity={on ? 1 : 0.45} strokeWidth={on ? 2.6 : 1.6} strokeLinecap="round" />
              <circle cx={a.x} cy={a.y} r={on ? 5 : 3.4} fill="var(--route-deep)" />
              <circle cx={b.x} cy={b.y} r={on ? 4.4 : 3} fill="none"
                stroke="var(--route-deep)" strokeWidth={1.8} />
              <a href={`#ilan-${listing.id}`} aria-label={`${listing.fromLabel} → ${listing.toLabel} ilanına git`}>
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  className="cursor-pointer"
                  onMouseEnter={() => setActive(listing.id)}
                  onMouseLeave={() => setActive((c) => (c === listing.id ? null : c))}
                  onFocus={() => setActive(listing.id)}
                  onBlur={() => setActive(null)}
                />
              </a>
            </g>
          );
        })}
      </svg>

      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
        <span className="label-mono text-muted">
          {listings.length} açık ilan · rotaya tıkla, ilana git
        </span>
        {activeRoute && (
          <span className="text-sm font-semibold">
            {activeRoute.listing.fromLabel} → {activeRoute.listing.toLabel}
            <span className="label-mono ml-2 font-normal text-muted">
              {activeRoute.listing.vehicleTypeCode} · {activeRoute.listing.km} km
            </span>
          </span>
        )}
      </figcaption>
    </figure>
  );
}
