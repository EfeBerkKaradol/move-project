'use client';

import type { CargoCategory } from '@turmove/contracts';
import { formatVolume } from '@turmove/shared';

/**
 * "Ne taşımak istiyorsunuz?" paneli. Kartlar küçükten büyüğe sıralı ve her biri
 * somut bir ölçek referansı taşıyor — kullanıcı m³ okumaz, "sırt çantasına sığar" okur.
 */
export function CategoryGrid({
  categories,
  selected,
  onSelect,
}: {
  categories: CargoCategory[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Yük kategorisi"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {categories.map((c) => {
        const isSelected = c.code === selected;
        return (
          <button
            key={c.code}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(c.code)}
            className={[
              'rounded-card border p-5 text-left transition',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              isSelected
                ? 'border-amber bg-[var(--amber-soft)] ring-1 ring-amber'
                : 'border-line bg-surface hover:border-ink-muted',
            ].join(' ')}
          >
            <h3 className="font-semibold">{c.displayName}</h3>
            <p className="mt-1 text-sm text-muted">{c.scaleHint}</p>
            {c.typicalVolumeMaxM3 !== null && (
              <p className="mt-3 text-xs tabular-nums text-muted">
                {formatVolume(c.typicalVolumeMinM3 ?? 0)} – {formatVolume(c.typicalVolumeMaxM3)}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
