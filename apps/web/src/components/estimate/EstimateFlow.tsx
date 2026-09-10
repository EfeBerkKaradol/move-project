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
import type { CargoSelection } from '@/components/booking/CargoDetail';
import { FULL_LOAD_CATEGORY, declaredItems, encodeItems, isFullLoad } from '@/lib/cargo';
import { PlaceSearch } from '@/components/site/PlaceSearch';
import { fetchQuote } from '@/lib/api';
import { cityOf, matchDistrict, sameCity } from '@/lib/places';
import { type Aralik, PickupWindow } from '@/components/form/PickupWindow';
import { BOS_SECIM, CargoAdvisor } from './CargoAdvisor';
import { CargoPhotoPicker } from './CargoPhotoPicker';
import { EstimatePanel } from './EstimatePanel';
import { VehiclePicker } from './VehiclePicker';

type ServiceModel = 'INSTANT' | 'SCHEDULED';
type StopDetail = { floor: number; hasElevator: boolean };

const GROUND: StopDetail = { floor: 0, hasElevator: true };

/** Otomatik uygulanan ek hizmetler seçenek olarak gösterilmez (fiyat motoru kendi ekler). */
const AUTO_EXTRAS = ['NO_ELEVATOR', 'WAITING', 'EXTRA_STOP'];

/**
 * KARINCA fiyat akışı (docs/11 §2): rota → zaman → yük → araç → tahmini aralık.
 *
 * <p>Kullanıcı ilanının tamamını burada, <strong>üye olmadan</strong> kuruyor.
 * Kayıt yalnızca yayınlama anında isteniyor: kimliğini vermeden önce ne
 * ödeyeceğini görmek, kaydın karşılığını bilerek üye olmak demek.
 *
 * <p>Bölümlerin sırası akışın kendisi: "ne zaman"dan sonra "ne taşınıyor"
 * geliyor, araç ondan sonra — çünkü araç, yükün sonucu. Tarif bölümü eskiden
 * araç seçiminin yanında bir bağlantıydı ve kullanıcı aracı yükünü anlatmadan
 * seçiyordu; öneri motoru da o yüzden çoğu ziyaretçiye hiç çalışmıyordu.
 *
 * <p>Tahmin, alanların tamamı dolmadan gösterilmiyor. Yarım beyanla verilen bir
 * rakam yanlış olur ve kullanıcı onu "fiyat" diye hatırlar; teklifler geldiğinde
 * aradaki fark pazarlık değil güven sorunu yaratır.
 */
export function EstimateFlow({
  vehicleTypes,
  districts,
  extraServices,
  catalog,
  signedIn,
  initial,
}: {
  vehicleTypes: VehicleType[];
  districts: District[];
  extraServices: ExtraService[];
  /** Kategori kataloğu yoksa (API kısmi) yük tarifi istenemez; bölüm sebebini yazar. */
  catalog: { categories: CargoCategory[]; items: CargoItem[]; presets: CargoPreset[] } | null;
  /** Oturum açıksa yayınla düğmesi doğrudan ilan adımına gider. */
  signedIn: boolean;
  initial: { from: string; to: string; vehicleCode: string | null };
}) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [serviceModel, setServiceModel] = useState<ServiceModel>('INSTANT');
  const [vehicleCode, setVehicleCode] = useState<string | null>(initial.vehicleCode);
  const [pickup, setPickup] = useState<StopDetail>(GROUND);
  const [dropoff, setDropoff] = useState<StopDetail>(GROUND);
  const [extras, setExtras] = useState<string[]>([]);
  const [alisPenceresi, setAlisPenceresi] = useState<Aralik | null>(null);
  const [categoryCode, setCategoryCode] = useState<string | null>(null);
  const [selection, setSelection] = useState<CargoSelection>(BOS_SECIM);
  const [fotografAdedi, setFotografAdedi] = useState(0);
  /** Araç seçiminin dayattığı kategori; kullanıcı kendi seçtiyse null. */
  const [forcedCategory, setForcedCategory] = useState<string | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickupDistrict = useMemo(() => matchDistrict(districts, from), [districts, from]);
  const dropoffDistrict = useMemo(() => matchDistrict(districts, to), [districts, to]);
  const vehicle = vehicleTypes.find((v) => v.code === vehicleCode) ?? null;
  const category = catalog?.categories.find((c) => c.code === categoryCode) ?? null;

  const kalemler = useMemo(() => declaredItems(category, selection), [category, selection]);
  // Hazır paket (oda/ev dolusu) kalem listesi üretmiyor ama yükün tarifidir;
  // kalemleri ilan adımı ayrıca soruyor, burada tarif sayılıyor.
  const tarifEdildi = Object.keys(kalemler).length > 0 || selection.presetCode !== null;

  /**
   * Beyan edilen toplam hacim — kaç fotoğraf gerektiğini bu belirliyor.
   * Hazır paket seçildiyse kalem yok ama tahmini hacmi var; ikisi de sayılıyor,
   * yoksa "ev dolusu eşya" diyen kullanıcı hiç uyarı almadan tek kareyle geçerdi.
   */
  const beyanHacmi = useMemo(() => {
    if (!catalog) return 0;
    const kalemlerinHacmi = new Map(catalog.items.map((i) => [i.code, i.volumeM3]));
    const kalemToplami = Object.entries(kalemler).reduce(
      (toplam, [code, adet]) => toplam + (kalemlerinHacmi.get(code) ?? 0) * adet,
      0,
    );
    const paket = selection.presetCode
      ? (catalog.presets.find((p) => p.code === selection.presetCode)?.estimatedVolumeM3 ?? 0)
      : 0;
    return kalemToplami + paket;
  }, [catalog, kalemler, selection.presetCode]);

  /**
   * Yayınlanabilir bir ilan için eksik olanlar. Tek listede duruyor çünkü üç yer
   * birden okuyor: tahmin kapısı, yayınla düğmesi ve yan paneldeki özet. Ayrı
   * ayrı hesaplansalardı biri güncellenip diğeri unutulurdu.
   */
  const eksikler = [
    !pickupDistrict ? 'alış noktası' : null,
    !dropoffDistrict ? 'teslim noktası' : null,
    !alisPenceresi ? 'alış tarihi ve saati' : null,
    // Katalog gelmediğinde tarif formu gösterilemiyor; isteyemediğimiz bir alanı
    // zorunlu tutmak, kendi arızamızı kullanıcıya kesmek olurdu
    catalog && !tarifEdildi ? 'yük tarifi' : null,
    fotografAdedi === 0 ? 'yük fotoğrafı' : null,
    !vehicleCode ? 'araç tipi' : null,
  ].filter((e) => e !== null);

  const tamam = eksikler.length === 0;

  const request = useMemo<QuoteRequest | null>(() => {
    // Tahmin ancak beyan tamamlandığında isteniyor: yarım veriyle hesaplanan
    // aralık, kullanıcının aklında kalan ama tutmayan bir rakam oluyor
    if (!tamam || !vehicleCode || !pickupDistrict || !dropoffDistrict) return null;
    return {
      serviceModel,
      vehicleTypeCode: vehicleCode,
      stops: [
        { districtId: pickupDistrict.id, ...pickup },
        { districtId: dropoffDistrict.id, ...dropoff },
      ],
      extraServices: extras,
    };
  }, [tamam, vehicleCode, pickupDistrict, dropoffDistrict, serviceModel, pickup, dropoff, extras]);

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
    if (alisPenceresi) {
      q.set('bas', alisPenceresi.start);
      q.set('bit', alisPenceresi.end);
    }
    // Beyan da taşınıyor; ilan adımı aynı soruyu tekrar sormasın
    const yuk = encodeItems(kalemler);
    if (yuk) q.set('yuk', yuk);
    return `/panel/ilan/yeni?${q.toString()}`;
  })();

  const originCity = cityOf(from);

  /** Alış ili değişince başka ildeki teslim noktası temizleniyor (bkz. QuoteWidget). */
  const changeFrom = (v: string) => {
    setFrom(v);
    if (!sameCity(v, to)) setTo('');
  };

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
        {/* 1 — Rota */}
        <section className="rounded-card border border-line bg-surface p-5 sm:p-6">
          <div className="relative space-y-4">
            <PlaceSearch
              name="nereden"
              label="Nereden"
              value={from}
              onChange={changeFrom}
              placeholder="İstanbul, Hadımköy"
              icon={
                <>
                  <path d="M8 14.5s5-4.2 5-7.9A5 5 0 0 0 3 6.6c0 3.7 5 7.9 5 7.9Z" />
                  <circle cx="8" cy="6.6" r="1.9" />
                </>
              }
            />
            <PlaceSearch
              name="nereye"
              label="Nereye"
              value={to}
              onChange={setTo}
              onlyCity={originCity}
              placeholder={originCity ? `${originCity} içinde bir yer` : 'Önce nereden seçin'}
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

        {/* 2 — Ne zaman */}
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
                  onClick={() => {
                    setServiceModel(value);
                    // Biçim değişince pencere sıfırlanıyor: planlıda seçilmiş ileri
                    // bir tarihin anlık taşımada karşılığı yok
                    setAlisPenceresi(null);
                  }}
                  className={`rounded-field border p-3 text-left transition ${
                    on ? 'border-route bg-[var(--route-soft)]' : 'border-line bg-surface hover:border-muted'
                  }`}
                >
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                </button>
              );
            })}
          </div>

          {/* Saat iki biçimde de soruluyor. Anlık taşımada gün bugüne sabit:
              "en kısa sürede" bile bir aralığa denk geliyor ve araç sahibinin
              bunu bilmesi gerekiyor. */}
          <div className="mt-5 rounded-card border border-line bg-surface p-5">
            <PickupWindow
              // Biçim değişince bileşen sıfırdan kuruluyor; aksi hâlde planlıda
              // yazılmış saatler anlık moda taşınırdı
              key={serviceModel}
              serviceModel={serviceModel}
              onChange={setAlisPenceresi}
              defaultValue={alisPenceresi}
            />
          </div>
        </section>

        {/* 3 — Yük: araçtan önce, çünkü araç yükün sonucu */}
        <section>
          <h2 className="label-mono text-muted">Ne taşınacak</h2>
          <div className="mt-2.5 rounded-card border border-line bg-surface p-5 sm:p-6">
            {catalog ? (
              <>
                <h3 className="text-lg font-bold">
                  {forcedCategory ? 'Ne yükleniyor?' : 'Yükünü tarif et, aracı biz seçelim'}
                </h3>
                <p className="mb-5 mt-1 text-sm text-muted">
                  {forcedCategory
                    ? 'Palet, tomruk, big-bag, konteyner — cinsini ve adedini gir; araç ve fiyat buna göre netleşir.'
                    : 'Kategori seç, adetleri gir; öneri gerekçesiyle gelir ve araç seçimine yazılır.'}
                </p>
                <CargoAdvisor
                  categories={catalog.categories}
                  items={catalog.items}
                  presets={catalog.presets}
                  vehicleTypes={vehicleTypes}
                  floors={floors}
                  categoryCode={categoryCode}
                  onCategory={setCategoryCode}
                  selection={selection}
                  onSelection={setSelection}
                  onVehicle={onAdvisorVehicle}
                  forcedCategory={forcedCategory}
                />
              </>
            ) : (
              /* Katalog gelmediğinde bölüm SESSİZCE kaybolmuyor. Eskiden öyleydi ve
                 kısa bir API kesintisi, "yük seçme ekranı nereye gitti?" sorusunu
                 cevapsız bırakıyordu. Eksik olanı söylemek, hiçbir şey dememekten iyi. */
              <p className="text-sm text-muted">
                Yük tarif etme şu an yüklenemedi. Birazdan tekrar deneyin.
              </p>
            )}

            <div className="mt-6 border-t border-line pt-6">
              <CargoPhotoPicker onChange={setFotografAdedi} beyanHacmiM3={beyanHacmi} />
            </div>
          </div>
        </section>

        {/* 4 — Araç: öneri buraya yazıyor, kullanıcı ezebiliyor */}
        <section>
          <h2 className="label-mono text-muted">Araç tipi</h2>
          <div className="mt-2.5">
            <VehiclePicker
              vehicles={vehicleTypes}
              value={vehicleCode}
              onChange={(code) => {
                setVehicleCode(code);
                // Kamyon/tır seçildiğinde tarif formu komple yüke geçiyor: bu
                // araçlarda "kaç koli?" sorusunun karşılığı yok. Kategori
                // değiştiği için önceki seçim de bırakılıyor.
                const fullLoad = isFullLoad(code);
                const yeniKategori = fullLoad ? FULL_LOAD_CATEGORY : null;
                const kategoriDegisti = fullLoad
                  ? categoryCode !== FULL_LOAD_CATEGORY
                  : forcedCategory !== null;
                setForcedCategory(yeniKategori);
                if (kategoriDegisti) {
                  setCategoryCode(yeniKategori);
                  setSelection(BOS_SECIM);
                }
              }}
              className="grid-cols-2 sm:grid-cols-3"
            />
          </div>
        </section>

        {/* 5 — Ek hizmetler */}
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
                    className={`rounded-field border px-3.5 py-2.5 text-sm transition pointer-coarse:min-h-11 ${
                      on ? 'border-route bg-[var(--route-soft)]' : 'border-line bg-surface hover:border-muted'
                    }`}
                  >
                    {e.displayName}
                    <span className="label-mono ml-2 text-muted">
                      {/* Birim etiketi olmadan "+1.500 ₺" tek seferlik bir ücret gibi
                          okunuyordu; hamaliye kişi başına, asansörsüz kat kat başına. */}
                      {e.pricingType === 'PERCENT'
                        ? `%${e.rate}`
                        : `+${e.rate.toLocaleString('tr-TR')} ₺${e.unitLabel ? ` / ${e.unitLabel}` : ''}`}
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
          missing={eksikler}
          vehicleName={vehicle?.displayName ?? null}
          publishHref={publishHref}
          signedIn={signedIn}
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
    <div className="rounded-field border border-line bg-surface-2 px-3.5 py-3 transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-mono text-muted">{label}</span>
        {typed && !matched && (
          <span className="label-mono text-[var(--route-deep)]">Listeden ilçe seç</span>
        )}
        {matched && <span className="label-mono text-muted">{matched.cityName} · {matched.name}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label htmlFor={`${id}-kat`} className="flex min-h-11 cursor-pointer items-center gap-2">
          Kat
          <input
            id={`${id}-kat`}
            type="number"
            min={0}
            max={50}
            value={value.floor}
            onChange={(e) => onChange({ ...value, floor: Number(e.target.value) })}
            className="min-h-11 w-16 rounded-lg border border-line bg-surface px-2 py-2 tabular-nums transition hover:border-muted focus:border-route focus:outline-none focus:ring-2 focus:ring-route/25"
          />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.hasElevator}
            onChange={(e) => onChange({ ...value, hasElevator: e.target.checked })}
            className="size-5 cursor-pointer accent-[var(--route)]"
          />
          Asansör var
        </label>
      </div>
    </div>
  );
}
