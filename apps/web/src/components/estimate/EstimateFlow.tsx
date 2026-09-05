'use client';

import type {
  CargoCategory,
  CargoItem,
  CargoPreset,
  District,
  ExtraService,
  Quote,
  QuoteRequest,
  VehicleType,
} from '@tasiyoruz/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlaceSearch } from '@/components/site/PlaceSearch';
import { fetchQuote } from '@/lib/api';
import { matchDistrict } from '@/lib/places';
import { CargoAdvisor } from './CargoAdvisor';
import { EstimatePanel } from './EstimatePanel';
import { VehiclePicker } from './VehiclePicker';

type ServiceModel = 'INSTANT' | 'SCHEDULED';
type StopDetail = { floor: number; hasElevator: boolean };

const GROUND: StopDetail = { floor: 0, hasElevator: true };

/** Otomatik uygulanan ek hizmetler seçenek olarak gösterilmez (fiyat motoru kendi ekler). */
const AUTO_EXTRAS = ['NO_ELEVATOR', 'WAITING', 'EXTRA_STOP'];

/**
 * Taşıyoruz fiyat akışı (docs/11 §2): rota + araç tipi → tahmini aralık → ilan.
 *
 * <p>Sayfa geçişi yok; her seçim değişikliğinde tahmin sağda canlı güncellenir.
 * Aracını bilmeyen kullanıcı için docs/08 öneri motoru "yükümü tarif edeceğim"
 * bölümünde duruyor ve seçtiği aracı buradaki seçime yazıyor.
 */
export function EstimateFlow({
  vehicleTypes,
  districts,
  extraServices,
  catalog,
  initial,
}: {
  vehicleTypes: VehicleType[];
  districts: District[];
  extraServices: ExtraService[];
  /** Kategori kataloğu yoksa (API kısmi) danışman bölümü gizlenir. */
  catalog: { categories: CargoCategory[]; items: CargoItem[]; presets: CargoPreset[] } | null;
  initial: { from: string; to: string; vehicleCode: string | null };
}) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [serviceModel, setServiceModel] = useState<ServiceModel>('INSTANT');
  const [vehicleCode, setVehicleCode] = useState<string | null>(initial.vehicleCode);
  const [pickup, setPickup] = useState<StopDetail>(GROUND);
  const [dropoff, setDropoff] = useState<StopDetail>(GROUND);
  const [extras, setExtras] = useState<string[]>([]);
  const [advisorOpen, setAdvisorOpen] = useState(false);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickupDistrict = useMemo(() => matchDistrict(districts, from), [districts, from]);
  const dropoffDistrict = useMemo(() => matchDistrict(districts, to), [districts, to]);
  const vehicle = vehicleTypes.find((v) => v.code === vehicleCode) ?? null;

  const request = useMemo<QuoteRequest | null>(() => {
    if (!vehicleCode || !pickupDistrict || !dropoffDistrict) return null;
    return {
      serviceModel,
      vehicleTypeCode: vehicleCode,
      stops: [
        { districtId: pickupDistrict.id, ...pickup },
        { districtId: dropoffDistrict.id, ...dropoff },
      ],
      extraServices: extras,
    };
  }, [vehicleCode, pickupDistrict, dropoffDistrict, serviceModel, pickup, dropoff, extras]);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!request) {
      setQuote(null);
      setError(null);
      return;
    }
    // Hızlı ardışık seçimlerde önceki istek iptal edilir; her tuşta istek atılmaz
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      fetchQuote(request, controller.signal)
        .then((q) => {
          setQuote(q);
          setError(null);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setQuote(null);
          setError(err instanceof Error ? err.message : 'Tahmin hesaplanamadı.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [request]);

  // İlan sayfasına taşınan seçim: middleware giriş isterse kullanıcı aynı adrese döner
  const publishHref = (() => {
    const q = new URLSearchParams({
      nereden: from, nereye: to, arac: vehicleCode ?? '', model: serviceModel,
      pf: String(pickup.floor), pe: pickup.hasElevator ? '1' : '0',
      df: String(dropoff.floor), de: dropoff.hasElevator ? '1' : '0',
      ek: extras.join(','),
    });
    return `/panel/ilan/yeni?${q.toString()}`;
  })();

  const swap = () => {
    setFrom(to);
    setTo(from);
    setPickup(dropoff);
    setDropoff(pickup);
  };
  const toggleExtra = (code: string) =>
    setExtras((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  const onAdvisorVehicle = useCallback((code: string) => setVehicleCode(code), []);

  const selectableExtras = extraServices.filter((e) => !AUTO_EXTRAS.includes(e.code));
  const floors = useMemo(() => [pickup, dropoff], [pickup, dropoff]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-8">
        {/* Rota */}
        <section className="rounded-card border border-line bg-surface p-5 sm:p-6">
          <div className="relative space-y-4">
            <PlaceSearch
              id="nereden"
              name="nereden"
              label="Nereden"
              value={from}
              onChange={setFrom}
              placeholder="İstanbul, Hadımköy"
              icon={
                <>
                  <path d="M8 14.5s5-4.2 5-7.9A5 5 0 0 0 3 6.6c0 3.7 5 7.9 5 7.9Z" />
                  <circle cx="8" cy="6.6" r="1.9" />
                </>
              }
            />
            <PlaceSearch
              id="nereye"
              name="nereye"
              label="Nereye"
              value={to}
              onChange={setTo}
              placeholder="Ankara, Ostim"
              icon={<path d="M2.5 8h11M9.5 4.5 13 8l-3.5 3.5" />}
            />
            <button
              type="button"
              onClick={swap}
              aria-label="Alış ve teslim noktalarını değiştir"
              className="absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-ink shadow-card transition hover:bg-surface-2"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 2.5v11M5 13.5 2.5 11M11 13.5v-11M11 2.5 13.5 5" />
              </svg>
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StopDetails
              label="Alış"
              matched={pickupDistrict}
              typed={from}
              value={pickup}
              onChange={setPickup}
            />
            <StopDetails
              label="Teslim"
              matched={dropoffDistrict}
              typed={to}
              value={dropoff}
              onChange={setDropoff}
            />
          </div>
        </section>

        {/* Ne zaman */}
        <section>
          <h2 className="label-mono text-muted">Ne zaman</h2>
          <div role="radiogroup" className="mt-2.5 grid grid-cols-2 gap-2.5 sm:max-w-md">
            {(
              [
                ['INSTANT', 'Anlık taşıma', 'Bugün, en kısa sürede'],
                ['SCHEDULED', 'Planlı taşıma', 'İleri tarihli randevu'],
              ] as const
            ).map(([value, label, hint]) => {
              const on = serviceModel === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setServiceModel(value)}
                  className={`rounded-field border p-3 text-left transition ${
                    on ? 'border-amber bg-[var(--amber-soft)]' : 'border-line bg-surface hover:border-muted'
                  }`}
                >
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Araç */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="label-mono text-muted">Araç tipi</h2>
            {catalog && (
              <button
                type="button"
                onClick={() => setAdvisorOpen((o) => !o)}
                aria-expanded={advisorOpen}
                className="text-sm font-semibold text-[#8a5c10] underline-offset-4 hover:underline"
              >
                {advisorOpen ? 'Danışmanı kapat' : 'Hangi araç lazım bilmiyorum →'}
              </button>
            )}
          </div>
          <div className="mt-2.5">
            <VehiclePicker
              vehicles={vehicleTypes}
              value={vehicleCode}
              onChange={setVehicleCode}
              className="grid-cols-2 sm:grid-cols-3"
            />
          </div>

          {catalog && advisorOpen && (
            <div className="mt-5 rounded-card border border-line bg-surface p-5 sm:p-6">
              <h3 className="text-lg font-bold">Yükünü tarif et, aracı biz seçelim</h3>
              <p className="mb-5 mt-1 text-sm text-muted">
                Kategori seç, adetleri gir; öneri gerekçesiyle gelir ve yukarıdaki seçime yazılır.
              </p>
              <CargoAdvisor
                categories={catalog.categories}
                items={catalog.items}
                presets={catalog.presets}
                vehicleTypes={vehicleTypes}
                floors={floors}
                onVehicle={onAdvisorVehicle}
              />
            </div>
          )}
        </section>

        {/* Ek hizmetler */}
        {selectableExtras.length > 0 && (
          <section>
            <h2 className="label-mono text-muted">Ek hizmetler</h2>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {selectableExtras.map((e) => {
                const on = extras.includes(e.code);
                return (
                  <button
                    key={e.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleExtra(e.code)}
                    title={e.description ?? undefined}
                    className={`rounded-field border px-3.5 py-2.5 text-sm transition ${
                      on ? 'border-amber bg-[var(--amber-soft)]' : 'border-line bg-surface hover:border-muted'
                    }`}
                  >
                    {e.displayName}
                    <span className="label-mono ml-2 text-muted">
                      {e.pricingType === 'PERCENT' ? `%${e.rate}` : `+${e.rate.toLocaleString('tr-TR')} ₺`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="lg:sticky lg:top-6">
        <EstimatePanel
          quote={quote}
          loading={loading}
          error={error}
          ready={request !== null}
          vehicleName={vehicle?.displayName ?? null}
          publishHref={publishHref}
        />
      </div>
    </div>
  );
}

/** Kat ve asansör — fiyatı etkiler (taşıma zorluğu). Eşleşme durumu da burada görünür. */
function StopDetails({
  label,
  matched,
  typed,
  value,
  onChange,
}: {
  label: string;
  matched: District | null;
  typed: string;
  value: StopDetail;
  onChange: (v: StopDetail) => void;
}) {
  const id = label.toLowerCase();
  return (
    <div className="rounded-field border border-line bg-surface-2 px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-mono text-muted">{label}</span>
        {typed && !matched && (
          <span className="label-mono text-[#8a5c10]">Listeden ilçe seç</span>
        )}
        {matched && <span className="label-mono text-muted">{matched.cityName} · {matched.name}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label htmlFor={`${id}-kat`} className="flex items-center gap-2">
          Kat
          <input
            id={`${id}-kat`}
            type="number"
            min={0}
            max={50}
            value={value.floor}
            onChange={(e) => onChange({ ...value, floor: Number(e.target.value) })}
            className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5 tabular-nums"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.hasElevator}
            onChange={(e) => onChange({ ...value, hasElevator: e.target.checked })}
            className="size-4 accent-[var(--amber)]"
          />
          Asansör var
        </label>
      </div>
    </div>
  );
}
