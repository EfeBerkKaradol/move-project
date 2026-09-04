'use client';

import type {
  CargoCategory,
  CargoDeclarationRequest,
  CargoItem,
  CargoPreset,
  District,
  ExtraService,
  Quote,
  QuoteRequest,
  VehicleRecommendation,
  VehicleType,
} from '@turmove/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchQuote, fetchRecommendation } from '@/lib/api';
import { AddressStep, type StopInput } from './AddressStep';
import { CategoryGrid } from './CategoryGrid';
import { CargoDetail, type CargoSelection } from './CargoDetail';
import { PricePanel } from './PricePanel';
import { RecommendationPanel } from './RecommendationPanel';

type ServiceModel = 'INSTANT' | 'SCHEDULED';

const EMPTY_SELECTION: CargoSelection = {
  itemQuantities: {},
  presetCode: null,
  packageCount: 0,
};

const EMPTY_STOP: StopInput = { districtId: '', floor: 0, hasElevator: true };

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
  districts,
  extraServices,
}: {
  categories: CargoCategory[];
  items: CargoItem[];
  presets: CargoPreset[];
  vehicleTypes: VehicleType[];
  districts: District[];
  extraServices: ExtraService[];
}) {
  const [serviceModel, setServiceModel] = useState<ServiceModel>('INSTANT');
  const [categoryCode, setCategoryCode] = useState<string | null>(null);
  const [selection, setSelection] = useState<CargoSelection>(EMPTY_SELECTION);
  const [overrideCode, setOverrideCode] = useState<string | null>(null);

  const [recommendation, setRecommendation] = useState<VehicleRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickup, setPickup] = useState<StopInput>(EMPTY_STOP);
  const [dropoff, setDropoff] = useState<StopInput>(EMPTY_STOP);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

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
      stops: [
        { floor: pickup.floor, hasElevator: pickup.hasElevator },
        { floor: dropoff.floor, hasElevator: dropoff.hasElevator },
      ],
    };
  }, [category, selection, pickup, dropoff]);

  /** Seçilen araç: kullanıcı öneriyi ezdiyse onunki, yoksa birincil öneri. */
  const chosenVehicleCode = overrideCode ?? recommendation?.primary.vehicleTypeCode ?? null;

  const quoteRequest = useMemo<QuoteRequest | null>(() => {
    if (!chosenVehicleCode || !pickup.districtId || !dropoff.districtId) return null;
    return {
      serviceModel,
      vehicleTypeCode: chosenVehicleCode,
      stops: [
        { districtId: pickup.districtId, floor: pickup.floor, hasElevator: pickup.hasElevator },
        { districtId: dropoff.districtId, floor: dropoff.floor, hasElevator: dropoff.hasElevator },
      ],
      extraServices: selectedExtras,
    };
  }, [chosenVehicleCode, pickup, dropoff, selectedExtras, serviceModel]);

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

  const quoteAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!quoteRequest) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const timer = setTimeout(() => {
      quoteAbortRef.current?.abort();
      const controller = new AbortController();
      quoteAbortRef.current = controller;

      setQuoteLoading(true);
      fetchQuote(quoteRequest, controller.signal)
        .then((result) => {
          setQuote(result);
          setQuoteError(null);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setQuoteError(err instanceof Error ? err.message : 'Fiyat hesaplanamadı.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setQuoteLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [quoteRequest]);

  const toggleExtra = (code: string) =>
    setSelectedExtras((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted">
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
                'rounded-field border px-5 py-3 text-left transition',
                serviceModel === value
                  ? 'border-amber bg-[var(--amber-soft)] ring-1 ring-amber'
                  : 'border-line bg-surface hover:border-ink-muted',
              ].join(' ')}
            >
              <span className="block font-medium">{label}</span>
              <span className="block text-xs text-muted">{hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Ne taşımak istiyorsunuz?</h2>
        <p className="mt-1 text-sm text-muted">
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
            <p className="mt-1 mb-5 text-sm text-muted">{category.scaleHint}</p>
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

          </div>
        </section>
      )}

      {recommendation && (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-xl font-semibold">Nereden nereye?</h2>
            <p className="mt-1 mb-5 text-sm text-muted">
              Adres arama harita servisi devreye girince gelecek. Şimdilik ilçe seçimiyle
              takribî mesafe hesaplanıyor.
            </p>
            <AddressStep
              districts={districts}
              extraServices={extraServices}
              pickup={pickup}
              dropoff={dropoff}
              selectedExtras={selectedExtras}
              onPickup={setPickup}
              onDropoff={setDropoff}
              onToggleExtra={toggleExtra}
            />
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <PricePanel
              quote={quote}
              loading={quoteLoading}
              error={quoteError}
              onNegotiate={() => undefined}
            />
          </div>
        </section>
      )}
    </div>
  );
}
