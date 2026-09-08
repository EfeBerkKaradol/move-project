'use client';

import type { CargoCategory, CargoItem, VehicleType } from '@tasiyoruz/contracts';
import { useId, useMemo, useState } from 'react';

/**
 * Yükün kalem kalem beyanı.
 *
 * <p>Serbest metin ("biraz eşya var") araç sahibi için işe yaramıyordu: hacmi ve kaç
 * kişi gerektiğini tahmin etmek zorunda kalıyor, tahmin tutmayınca iş kapıda
 * bozuluyordu. Seçim, tahmini ölçülebilir bir şeye çeviriyor.
 *
 * <p>Arama var çünkü liste otuz kalemi geçiyor ve kimse "gardırop"u kaydırarak
 * aramak istemiyor. Adet artırıcıları büyük: aynı kalemden sekiz koli seçmek
 * sekiz ayrı satır eklemek olmamalı.
 */
export function CargoDeclaration({
  items,
  categories,
  vehicle,
  selected,
  onChange,
}: {
  items: CargoItem[];
  categories: CargoCategory[];
  vehicle: VehicleType;
  selected: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  const [query, setQuery] = useState('');
  const searchId = useId();

  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.code, c.displayName])),
    [categories],
  );
  // Grup sırası katalogdan: kategoriler orada küçükten büyüğe dizili (zarf, koli,
  // tekil eşya). Kalemlerin geliş sırasına bırakılsaydı gruplar, hangi kategorinin
  // ilk kalemi öne düştüyse ona göre rastgele sıralanırdı.
  const categoryOrder = useMemo(
    () => new Map(categories.map((c, i) => [c.code, c.sortOrder ?? i])),
    [categories],
  );

  const visible = useMemo(() => {
    const q = normalize(query);
    return q ? items.filter((i) => normalize(i.displayName).includes(q)) : items;
  }, [items, query]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, CargoItem[]>();
    for (const item of visible) {
      const list = byCategory.get(item.categoryCode) ?? [];
      list.push(item);
      byCategory.set(item.categoryCode, list);
    }
    return [...byCategory.entries()].sort(
      ([a], [b]) => (categoryOrder.get(a) ?? 0) - (categoryOrder.get(b) ?? 0),
    );
  }, [visible, categoryOrder]);

  const totals = useMemo(() => summarize(items, selected), [items, selected]);
  const warning = fitWarning(totals, vehicle);

  const setQuantity = (code: string, quantity: number) => {
    const next = { ...selected };
    if (quantity <= 0) delete next[code];
    else next[code] = Math.min(quantity, 99);
    onChange(next);
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="label-mono text-muted">Ne taşıyacağız?</span>
        {totals.pieces > 0 && (
          <span className="label-mono text-muted">
            {totals.pieces} parça · {totals.volumeM3.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m³ ·{' '}
            {totals.weightKg.toLocaleString('tr-TR')} kg
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        Seçtiğin kalemler ilanda görünür; araç sahibi teklifini buna bakarak verir.
      </p>

      <label htmlFor={searchId} className="sr-only">
        Eşya ara
      </label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Eşya ara — koltuk, koli, buzdolabı…"
        className="mt-3 min-h-11 w-full rounded-field border border-line bg-surface-2 px-3.5 py-2.5 text-[15px] outline-none placeholder:text-muted transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25"
      />

      {grouped.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Aramana uyan eşya yok. Listede olmayan bir şey taşıyorsan{' '}
          <strong className="font-semibold text-ink">Diğer</strong> kalemini seçip aşağıdaki
          alana tarif edebilirsin.
        </p>
      ) : (
        <div
          className={[
            'mt-3 rounded-field border border-line',
            // İç kaydırma ekran genişliğine değil işaretçiye bağlı: tablet de
            // dokunmatik. Parmakla kaydırırken liste kutusuna düşen hareket sayfayı
            // kilitliyordu; dokunmatikte liste akışta uzuyor, uzun sayfa kaydırma
            // tuzağından iyi.
            'pointer-fine:max-h-96 pointer-fine:overflow-y-auto',
          ].join(' ')}
        >
          {grouped.map(([code, group]) => (
            <section key={code}>
              {/* Dokunmatikte liste akışta olduğu için başlık sayfaya yapışıyor ve
                  site başlığının altında durması gerekiyor; fareyle kaydırılan
                  kutunun içinde ise kutunun tepesine. */}
              <h3 className="label-mono sticky top-18 z-1 border-b border-line bg-surface-2 px-3 py-2 text-muted pointer-fine:top-0">
                {categoryName.get(code) ?? code}
              </h3>
              <ul>
                {group.map((item) => {
                  const quantity = selected[item.code] ?? 0;
                  return (
                    <li
                      key={item.code}
                      className={[
                        'flex items-center gap-2 border-b border-line px-3 py-1.5 last:border-b-0 sm:gap-3',
                        quantity > 0 ? 'bg-route/8' : '',
                      ].join(' ')}
                    >
                      <span className="min-w-0 flex-1">
                        {/* Kırpma yok: dar ekranda "Koltuk takımı (3+1+1)" ile "Koltuk
                            takımı" ayırt edilemez hâle geliyordu. İki satıra sarsın. */}
                        <span className="block text-sm leading-snug font-semibold">{item.displayName}</span>
                        <span className="label-mono text-muted">
                          {item.volumeM3.toLocaleString('tr-TR')} m³ · {item.weightKg} kg
                        </span>
                      </span>
                      <Stepper
                        label={item.displayName}
                        quantity={quantity}
                        onChange={(q) => setQuantity(item.code, q)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {warning && (
        <p
          role="status"
          className="mt-3 rounded-field border border-[#e0b400] bg-[#fff7e0] px-3 py-2 text-sm text-[#6b5300]"
        >
          {warning}
        </p>
      )}
    </div>
  );
}

function Stepper({
  label,
  quantity,
  onChange,
}: {
  label: string;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity === 0}
        aria-label={`${label} adedini azalt`}
        className="size-11 rounded-field border border-line text-lg leading-none transition hover:border-route hover:bg-surface-2 disabled:opacity-35"
      >
        −
      </button>
      {/* Sayı sabit genişlikte: adet değişince satırdaki her şey kaymasın */}
      <span aria-live="polite" className="stat w-7 text-center text-sm">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label={`${label} adedini artır`}
        className="size-11 rounded-field border border-line text-lg leading-none transition hover:border-route hover:bg-surface-2"
      >
        +
      </button>
    </span>
  );
}

export function summarize(items: CargoItem[], selected: Record<string, number>) {
  const byCode = new Map(items.map((i) => [i.code, i]));
  let pieces = 0;
  let volumeM3 = 0;
  let weightKg = 0;
  let longestEdgeCm = 0;
  for (const [code, quantity] of Object.entries(selected)) {
    const item = byCode.get(code);
    if (!item) continue;
    pieces += quantity;
    volumeM3 += item.volumeM3 * quantity;
    weightKg += item.weightKg * quantity;
    longestEdgeCm = Math.max(longestEdgeCm, item.longestEdgeCm);
  }
  return { pieces, volumeM3, weightKg, longestEdgeCm };
}

/**
 * Seçilen araç yükü kaldırıyor mu?
 *
 * <p>Sunucu bunu yayın anında zaten hesaplıyor; buradaki kontrol kullanıcıyı formu
 * doldurup gönderdikten sonra değil, seçim yaparken uyarmak için. Engellemiyor:
 * hacim tahmini kaba ve "sığmaz" demek yanlış olabilir — kararı kullanıcı veriyor.
 */
export function fitWarning(
  totals: { volumeM3: number; weightKg: number; longestEdgeCm: number },
  vehicle: VehicleType,
): string | null {
  if (totals.longestEdgeCm > vehicle.innerLengthCm) {
    return `Seçtiğin eşyaların en uzunu ${totals.longestEdgeCm} cm; ${vehicle.displayName} kasası ${vehicle.innerLengthCm} cm. Daha büyük bir araç gerekebilir.`;
  }
  if (totals.weightKg > vehicle.payloadKg) {
    return `Beyan ${totals.weightKg.toLocaleString('tr-TR')} kg; ${vehicle.displayName} ${vehicle.payloadKg.toLocaleString('tr-TR')} kg taşıyor. Daha büyük bir araç gerekebilir.`;
  }
  // %90'ı geçince uyarıyoruz: kalemler yaklaşık ve tam dolu bir kasa pratikte dolmuyor
  if (totals.volumeM3 > vehicle.volumeM3 * 0.9) {
    return `Beyan ${totals.volumeM3.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m³; ${vehicle.displayName} ${vehicle.volumeM3.toLocaleString('tr-TR')} m³. Sığmayabilir — bir üst aracı düşünebilirsin.`;
  }
  return null;
}

/** Türkçe arama: "gardirop" yazan da gardırobu bulsun. */
function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr')
    .replaceAll('ı', 'i')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c');
}
