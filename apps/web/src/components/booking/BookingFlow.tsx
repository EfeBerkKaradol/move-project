'use client';

import type {
  CargoCategory,
  CargoDeclarationRequest,
  CargoItem,
  CargoPreset,
  VehicleRecommendation,
  VehicleType,
} from '@turmove/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchRecommendation } from '@/lib/api';
import { CategoryGrid } from './CategoryGrid';
import { CargoDetail, type CargoSelection } from './CargoDetail';
import { RecommendationPanel } from './RecommendationPanel';

type ServiceModel = 'INSTANT' | 'SCHEDULED';

const EMPTY_SELECTION: CargoSelection = {
  itemQuantities: {},
  presetCode: null,
  packageCount: 0,
  pickupFloor: 0,
  pickupHasElevator: true,
};

/**
 * Kritik akış adım 1-4 (docs/06 §3): hizmet modeli → kategori → detay → araç önerisi.
 *
 * Adımlar arasında sayfa geçişi yok — kullanıcı seçim yaptıkça öneri yanda canlı
 * güncelleniyor. Algılanan hızı belirgin biçimde artıran şey bu.
 */
export function BookingFlow({
  categories,
  items,
  presets,
  vehicleTypes,
}: {
  categories: CargoCategory[];
  items: CargoItem[];
  presets: CargoPreset[];
  vehicleTypes: VehicleType[];
}) {
  const [serviceModel, setServiceModel] = useState<ServiceModel>('INSTANT');
  const [categoryCode, setCategoryCode] = useState<string | null>(null);
  const [selection, setSelection] = useState<CargoSelection>(EMPTY_SELECTION);
  const [overrideCode, setOverrideCode] = useState<string | null>(null);

  const [recommendation, setRecommendation] = useState<VehicleRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = categories.find((c) => c.code === categoryCode) ?? null;
  const categoryItems = useMemo(
    () => (categoryCode ? items.filter((i) => i.categoryCode === categoryCode) : []),
    [items, categoryCode],
  );
  const categoryPresets = useMemo(
    () => (categoryCode ? presets.filter((p) => p.categoryCode === categoryCode) : []),
    [presets, categoryCode],
  );

  /** Öneri isteği — beyan boşsa hiç gönderilmez, sunucuya gereksiz yük binmesin. */
  const request = useMemo<CargoDeclarationRequest | null>(() => {
    if (!category || category.detailFormType === 'FREE_TEXT') return null;

    const chosenItems = Object.entries(selection.itemQuantities)
      .filter(([, q]) => q > 0)
      .map(([cargoItemCode, quantity]) => ({ cargoItemCode, quantity }));

    const hasInput =
      chosenItems.length > 0 || selection.packageCount > 0 || selection.presetCode !== null;
    if (!hasInput) return null;

    return {
      categoryCode: category.code,
      items: chosenItems,
      presetCode: selection.presetCode,
      packageCount: selection.packageCount || null,
      stops: [{ floor: selection.pickupFloor, hasElevator: selection.pickupHasElevator }],
    };
  }, [category, selection]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!request) {
      setRecommendation(null);
      setError(null);
      return;
    }

    // Her tuş vuruşunda istek atmıyoruz; hızlı ardışık seçimlerde önceki iptal edilir.
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      fetchRecommendation(request, controller.signal)
        .then((result) => {
          setRecommendation(result);
          setError(null);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setError('Öneri alınamadı. API çalışmıyor olabilir.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [request]);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-ink-muted">
          Ne zaman?
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {(
            [
              ['INSTANT', 'Anlık taşıma', 'Dakikalar içinde araç'],
              ['SCHEDULED', 'Planlı taşıma', 'İleri tarihli randevu'],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={serviceModel === value}
              onClick={() => setServiceModel(value)}
              className={[
                'rounded-xl border px-5 py-3 text-left transition',
                serviceModel === value
                  ? 'border-accent bg-accent-soft ring-1 ring-accent'
                  : 'border-line bg-surface hover:border-ink-muted',
              ].join(' ')}
            >
              <span className="block font-medium">{label}</span>
              <span className="block text-xs text-ink-muted">{hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Ne taşımak istiyorsunuz?</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Aracı size sormuyoruz — yükünüzü tarif edin, uygun aracı biz hesaplayalım.
        </p>
        <div className="mt-5">
          <CategoryGrid
            categories={categories}
            selected={categoryCode}
            onSelect={(code) => {
              setCategoryCode(code);
              setSelection(EMPTY_SELECTION);
              setOverrideCode(null);
            }}
          />
        </div>
      </section>

      {category && (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-xl font-semibold">{category.displayName}</h2>
            <p className="mt-1 mb-5 text-sm text-ink-muted">{category.scaleHint}</p>
            <CargoDetail
              category={category}
              items={categoryItems}
              presets={categoryPresets}
              selection={selection}
              onChange={setSelection}
            />
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <RecommendationPanel
              recommendation={recommendation}
              loading={loading}
              error={error}
              vehicleTypes={vehicleTypes}
              overrideCode={overrideCode}
              onOverride={setOverrideCode}
            />

            {recommendation && (
              <p className="mt-4 rounded-card border border-dashed border-line px-4 py-3 text-sm text-ink-muted">
                Sıradaki adım: adres girişi ve fiyat. Fiyatlandırma Faz 1&apos;de devreye
                girecek — {serviceModel === 'INSTANT' ? 'anlık' : 'planlı'} taşıma tarifesi
                firmalarla anlaşılan birim fiyatlara dayanacak.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
