'use client';

import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { District } from '@tasiyoruz/contracts';
import type { CityPlaces } from '@/data/places';
import { closedCityMatch, mergePlaces, searchPlaces, type PlaceOption } from '@/lib/places';
import { SERVED_CITIES_LABEL } from '@/lib/served-cities';

/** Veri ilk odaklanmada bir kez yüklenir; ana sayfa paketine girmez. */
let placesPromise: Promise<CityPlaces[]> | null = null;
const loadPlaces = () =>
  (placesPromise ??= import('@/data/places').then((m) => m.PLACES));

/**
 * Nereden / Nereye alanı: her harfte daralan ilçe + mahalle listesi.
 *
 * <p>İlçeler üstte, mahalleler ilçesine göre gruplanmış hâlde altta;
 * mahalle satırı "Beşiktaş - Cihannüma" biçiminde. Serbest metin de kabul
 * edilir — listede olmayan bir yer yazan kullanıcıyı engellemiyoruz.
 */
export function PlaceSearch({
  name,
  label,
  value,
  onChange,
  placeholder,
  icon,
  catalog,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  /**
   * Hizmet verilen ilçe katalogu (81 il). Yerel veri yalnızca İstanbul ve
   * Ankara'yı mahalle derinliğinde biliyor; katalog olmadan diğer illerde
   * seçilecek hiçbir şey çıkmıyor ve rota çözülemiyor.
   */
  catalog?: District[] | null;
}) {
  const uid = useId();
  // Alan kimliği bileşenin kendisinden üretiliyor. Sabit yazıldığında aynı widget
  // sayfada iki kez render edilince (hero + dar ekran bölümü) iki öğe aynı id'yi
  // taşıyordu ve <label> yanlış olana, çoğu zaman gizli olana bağlanıyordu.
  const inputId = `${uid}-${name}`;
  const listId = `${uid}-liste`;
  const [data, setData] = useState<CityPlaces[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Birleştirme her tuşta değil, veri ya da katalog değişince
  const kaynak = useMemo(() => (data ? mergePlaces(data, catalog) : null), [data, catalog]);
  const options: PlaceOption[] = kaynak && open ? searchPlaces(kaynak, value) : [];
  // Kapalı il mi, yoksa bulunamayan bir ad mı? İkisine aynı cümle gösterilemez.
  const kapaliIl = options.length === 0 ? closedCityMatch(value, catalog) : null;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Klavyeyle gezinirken aktif satır görünür kalsın
  useEffect(() => {
    if (active < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const openList = () => {
    setOpen(true);
    if (!data) void loadPlaces().then(setData);
  };

  const select = (opt: PlaceOption) => {
    onChange(opt.value);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) openList();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && active >= 0 && options[active]) {
      e.preventDefault();
      select(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  const hasDistricts = options.some((o) => o.kind === 'district');
  const firstHood = options.findIndex((o) => o.kind === 'neighborhood');

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={inputId} className="label-mono text-muted">
        {label}
      </label>
      {/* Telefonda daha alçak: iki alan + etiketleri 168 piksel tutuyordu ve
          iri gri bloklar gibi duruyordu. sm'den itibaren eski ölçü. */}
      <div className="mt-1 flex items-center gap-2.5 rounded-field border border-line bg-surface-2 px-3 transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25 sm:mt-1.5 sm:px-3.5">
        <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icon}
        </svg>
        <input
          id={inputId}
          name={name}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(-1);
            if (!open) openList();
          }}
          onFocus={openList}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="w-full bg-transparent py-2.5 pr-12 text-[15px] outline-none placeholder:text-muted sm:py-3.5"
        />
      </div>

      {open && data && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-field border border-line bg-surface p-1.5 shadow-lift transition hover:border-route hover:bg-surface-2"
        >
          {/*
            Serbest metne izin vermek burada kullanıcıyı yanıltıyordu: yazdığı yer
            katalogda karşılık bulmayınca rota sessizce çözülemiyor ve form
            "eksik" demeye devam ediyordu. Hangi illerde hizmet verildiğini
            söylemek, neyi yanlış yaptığını anlatan tek dürüst cevap.
          */}
          {options.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted">
              {kapaliIl ? (
                <>
                  <span className="font-semibold text-ink">{kapaliIl}</span> için henüz taşıma
                  açmadık. Şu an {SERVED_CITIES_LABEL} içinde çalışıyoruz; diğer iller sırayla
                  açılıyor.
                </>
              ) : (
                <>
                  Bulunamadı. İlçe ya da mahalle adıyla dene — şu an{' '}
                  <span className="font-semibold text-ink">{SERVED_CITIES_LABEL}</span> içinde
                  taşıma yapıyoruz.
                </>
              )}
            </li>
          )}
          {options.map((opt, i) => {
            const isFirstHood = i === firstHood;
            return (
              <Fragment key={opt.value}>
                {i === 0 && hasDistricts && <GroupLabel>İlçeler</GroupLabel>}
                {isFirstHood && <GroupLabel>Mahalleler</GroupLabel>}
                <li role="presentation">
                <button
                  type="button"
                  role="option"
                  id={`${listId}-${i}`}
                  data-index={i}
                  aria-selected={i === active}
                  // mousedown: input blur'undan önce seçim tamamlansın
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(opt);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-baseline justify-between gap-3 rounded-[0.5rem] px-3 py-2.5 text-left text-sm transition ${
                    i === active ? 'bg-[var(--route-soft)] text-ink' : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {opt.kind === 'neighborhood' ? (
                      <>
                        <span className="text-muted">{opt.district} - </span>
                        <span className="font-semibold">{opt.neighborhood}</span>
                      </>
                    ) : (
                      <span className="font-semibold">{opt.district}</span>
                    )}
                  </span>
                  <span className="label-mono shrink-0 text-muted">{opt.city}</span>
                </button>
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <li className="label-mono px-3 pb-1 pt-2.5 text-muted" aria-hidden>{children}</li>;
}
