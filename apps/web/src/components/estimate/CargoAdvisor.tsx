'use client';

import type {
  CargoCategory,
  CargoDeclarationRequest,
  CargoItem,
  CargoPreset,
  VehicleRecommendation,
  VehicleType,
} from '@tasiyoruz/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CargoDetail, type CargoSelection } from '@/components/booking/CargoDetail';
import { CategoryGrid } from '@/components/booking/CategoryGrid';
import { RecommendationPanel } from '@/components/booking/RecommendationPanel';
import { fetchRecommendation } from '@/lib/api';

const EMPTY_SELECTION: CargoSelection = { itemQuantities: {}, presetCode: null, packageCount: 0 };

/**
 * "Hangi araç lazım bilmiyorum" yolu. Kullanıcı yükünü tarif eder, öneri motoru aracı
 * seçer ve seçim üst bileşene bildirilir (docs/08). Tasarımdaki "fotoğraf çekin, sistem
 * araç tipini önersin" bu motora dayanıyor; fotoğraf girişi ileride buraya eklenecek.
 */
export function CargoAdvisor({
  categories,
  items,
  presets,
  vehicleTypes,
  floors,
  onVehicle,
}: {
  categories: CargoCategory[];
  items: CargoItem[];
  presets: CargoPreset[];
  vehicleTypes: VehicleType[];
  floors: { floor: number; hasElevator: boolean }[];
  onVehicle: (code: string) => void;
}) {
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
      stops: floors,
    };
  }, [category, selection, floors]);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!request) {
      setRecommendation(null);
      setError(null);
      return;
    }
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

  // Öneri (ya da kullanıcının ezdiği araç) üst bileşendeki seçimi günceller
  const chosen = overrideCode ?? recommendation?.primary.vehicleTypeCode ?? null;
  useEffect(() => {
    if (chosen) onVehicle(chosen);
  }, [chosen, onVehicle]);

  return (
    <div className="space-y-6">
      <CategoryGrid
        categories={categories}
        selected={categoryCode}
        onSelect={(code) => {
          setCategoryCode(code);
          setSelection(EMPTY_SELECTION);
          setOverrideCode(null);
        }}
      />

      {category && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <h3 className="font-semibold">{category.displayName}</h3>
            <p className="mb-4 mt-1 text-sm text-muted">{category.scaleHint}</p>
            <CargoDetail
              category={category}
              items={categoryItems}
              presets={categoryPresets}
              selection={selection}
              onChange={setSelection}
            />
          </div>
          <RecommendationPanel
            recommendation={recommendation}
            loading={loading}
            error={error}
            vehicleTypes={vehicleTypes}
            overrideCode={overrideCode}
            onOverride={setOverrideCode}
          />
        </div>
      )}
    </div>
  );
}
