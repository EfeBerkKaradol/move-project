'use client';

import type { CargoCategory, CargoItem, CargoPreset } from '@turmove/contracts';
import type { Dispatch, SetStateAction } from 'react';
import { formatVolume } from '@turmove/shared';
import { Stepper } from './Stepper';

export type CargoSelection = {
  itemQuantities: Record<string, number>;
  presetCode: string | null;
  packageCount: number;
  pickupFloor: number;
  pickupHasElevator: boolean;
};

/**
 * Kategoriye özel detay formu. Kategori kartı kaba bir aralık verir; araç önerisinin
 * doğru olması için burada daraltıyoruz (bkz. docs/08 §4).
 */
export function CargoDetail({
  category,
  items,
  presets,
  selection,
  onChange,
}: {
  category: CargoCategory;
  items: CargoItem[];
  presets: CargoPreset[];
  selection: CargoSelection;
  onChange: Dispatch<SetStateAction<CargoSelection>>;
}) {
  /**
   * Güncellemeler fonksiyonel: `selection` prop'u bir render boyunca sabit kaldığı için
   * ardışık değişikliklerde ondan okumak bir öncekini ezerdi.
   */
  const set = (patch: Partial<CargoSelection>) =>
    onChange((prev) => ({ ...prev, ...patch }));

  const bumpItem = (code: string, delta: number, max = 99) =>
    onChange((prev) => ({
      ...prev,
      itemQuantities: {
        ...prev.itemQuantities,
        [code]: Math.min(max, Math.max(0, (prev.itemQuantities[code] ?? 0) + delta)),
      },
    }));

  const bumpPackages = (delta: number) =>
    onChange((prev) => ({
      ...prev,
      packageCount: Math.min(200, Math.max(0, prev.packageCount + delta)),
    }));

  return (
    <div className="space-y-7">
      {category.detailFormType === 'ITEM_PICKER' && (
        <fieldset>
          <legend className="text-sm font-medium">Hangi eşyaları taşıyacaksınız?</legend>
          <p className="mt-1 text-sm text-ink-muted">
            Seçtikçe tahmin ve araç önerisi anında güncellenir.
          </p>
          <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-surface">
            {items.map((item) => (
              <li key={item.code} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.displayName}</p>
                  <p className="text-xs tabular-nums text-ink-muted">
                    {formatVolume(item.volumeM3)} · {item.weightKg} kg · en uzun kenar{' '}
                    {item.longestEdgeCm} cm
                  </p>
                </div>
                <Stepper
                  label={item.displayName}
                  value={selection.itemQuantities[item.code] ?? 0}
                  onDelta={(d) => bumpItem(item.code, d)}
                />
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {category.detailFormType === 'PRESET' && (
        <fieldset>
          <legend className="text-sm font-medium">Ne kadar eşya var?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((p) => {
              const isSelected = selection.presetCode === p.code;
              return (
                <button
                  key={p.code}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => set({ presetCode: p.code })}
                  className={[
                    'rounded-lg border px-4 py-2.5 text-sm transition',
                    isSelected
                      ? 'border-accent bg-accent-soft ring-1 ring-accent'
                      : 'border-line bg-surface hover:border-ink-muted',
                  ].join(' ')}
                >
                  <span className="font-medium">{p.displayName}</span>
                  <span className="ml-2 tabular-nums text-xs text-ink-muted">
                    ≈ {formatVolume(p.estimatedVolumeM3)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {(category.detailFormType === 'PACKAGE_COUNT' ||
        category.detailFormType === 'ITEM_PICKER') && (
        <fieldset className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface px-4 py-3">
          <div>
            <legend className="text-sm font-medium">
              {category.detailFormType === 'PACKAGE_COUNT' ? 'Kaç paket?' : 'Ek koli var mı?'}
            </legend>
            <p className="mt-0.5 text-xs text-ink-muted">
              {category.code === 'BELGE_PAKET'
                ? 'Küçük paket / zarf — 0,02 m³'
                : 'Standart koli — 0,12 m³'}
            </p>
          </div>
          <Stepper
            label="Paket"
            max={200}
            value={selection.packageCount}
            onDelta={bumpPackages}
          />
        </fieldset>
      )}

      {category.detailFormType === 'FREE_TEXT' && (
        <p className="rounded-card border border-line bg-surface px-4 py-4 text-sm text-ink-muted">
          Bu kategori için aracı operasyon ekibimiz belirliyor. Yükünüzü tarif edip fotoğraf
          eklediğinizde size özel fiyat dönülür. Bu akış Faz 1&apos;de tamamlanacak.
        </p>
      )}

      {category.detailFormType !== 'FREE_TEXT' && (
        <fieldset className="rounded-card border border-line bg-surface px-4 py-4">
          <legend className="text-sm font-medium">Alış noktası</legend>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm">
              Kat
              <input
                type="number"
                min={0}
                max={50}
                value={selection.pickupFloor}
                onChange={(e) => set({ pickupFloor: Number(e.target.value) })}
                className="w-20 rounded-lg border border-line bg-ground px-3 py-2 tabular-nums"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selection.pickupHasElevator}
                onChange={(e) => set({ pickupHasElevator: e.target.checked })}
                className="size-4 accent-[var(--accent)]"
              />
              Asansör var
            </label>
          </div>
        </fieldset>
      )}
    </div>
  );
}
