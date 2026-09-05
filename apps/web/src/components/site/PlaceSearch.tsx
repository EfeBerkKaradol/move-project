'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { CityPlaces } from '@/data/places';
import { searchPlaces, type PlaceOption } from '@/lib/places';

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
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  const listId = useId();
  const [data, setData] = useState<CityPlaces[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const options: PlaceOption[] = data && open ? searchPlaces(data, value) : [];

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
      <label htmlFor={id} className="label-mono text-muted">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2.5 rounded-field border border-line bg-surface-2 px-3.5">
        <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icon}
        </svg>
        <input
          id={id}
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
          className="w-full bg-transparent py-3.5 pr-12 text-[15px] outline-none placeholder:text-muted"
        />
      </div>

      {open && data && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-field border border-line bg-surface p-1.5 shadow-lift"
        >
          {options.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted">
              Listede yok — yazdığın hâliyle kullanabilirsin.
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
                    i === active ? 'bg-[var(--amber-soft)] text-ink' : 'text-ink hover:bg-surface-2'
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
