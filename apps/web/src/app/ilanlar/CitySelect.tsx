'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * İle göre süzme — liste görünümünün il seçici.
 *
 * <p>Harita görünümünde iller çipler hâlinde duruyor; seksen bir çip listenin
 * üstünde iki ekran yer kaplıyordu ve asıl işi, yani ilanları, aşağı itiyordu.
 * Burada tek satırlık bir seçici var.
 *
 * <p>Sunucuya gidiyor (süzgeç sunucuda uygulanıyor) ve bekleme görünür:
 * seçici donuyor gibi görünmesin diye geçiş sırasında soluklaşıyor.
 */
export function CitySelect({
  cities,
  selected,
  hrefFor,
}: {
  cities: { cityCode: string; name: string; count: number }[];
  selected: string;
  /** Seçimi adrese çeviren kural sayfada duruyor; burada URL kurulmuyor. */
  hrefFor: string;
}) {
  const router = useRouter();
  const [bekliyor, basla] = useTransition();

  return (
    <label className={`inline-flex min-h-11 items-center gap-2 rounded-field border border-line bg-surface px-3 text-sm transition ${bekliyor ? 'opacity-60' : ''}`}>
      <span className="label-mono text-muted">İl</span>
      <select
        value={selected}
        aria-label="İle göre süz"
        className="min-h-11 bg-transparent pr-1 font-semibold outline-none"
        onChange={(e) => {
          const v = e.target.value;
          basla(() => router.push(hrefFor.replace('__IL__', v)));
        }}
      >
        <option value="">Tüm iller</option>
        {cities.map((c) => (
          <option key={c.cityCode} value={c.cityCode}>
            {c.name} ({c.count})
          </option>
        ))}
      </select>
    </label>
  );
}
