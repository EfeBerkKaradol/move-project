'use client';

import type { VehicleType } from '@tasiyoruz/contracts';
import { VehicleGlyph } from '@/components/site/VehicleGlyph';

export function capacityLabel(v: VehicleType) {
  return v.payloadKg >= 1000
    ? `${(v.payloadKg / 1000).toLocaleString('tr-TR')} ton`
    : `${v.payloadKg} kg`;
}

/** Araç tipi kartları. Pasif araç (TIR) "Yakında" etiketiyle görünür ama seçilemez. */
export function VehiclePicker({
  vehicles,
  value,
  onChange,
  className = 'grid-cols-2 sm:grid-cols-3',
}: {
  vehicles: VehicleType[];
  value: string | null;
  onChange: (code: string) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Araç tipi" className={`grid gap-2 ${className}`}>
      {vehicles.map((v) => {
        const soon = !v.active;
        const selected = value === v.code;
        return (
          <button
            key={v.code}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={soon}
            onClick={() => onChange(v.code)}
            className={[
              /*
               * Telefonda YATAY satır, sm'den itibaren kart. Dikey kart iki
               * sütunda yedi aracı dört satıra yayıyor ve yalnız araç seçici
               * 380 piksel tutuyordu — form ekrana sığmıyordu. Yatay satırda
               * aynı bilgi 190 piksele iniyor.
               */
              'flex items-center gap-2.5 rounded-field border p-2.5 text-left transition sm:block',
              soon
                ? 'cursor-not-allowed border-dashed border-line text-muted'
                : selected
                  ? 'border-route bg-[var(--route-soft)]'
                  : 'border-line bg-surface hover:border-muted',
            ].join(' ')}
          >
            <VehicleGlyph code={v.code} className="size-5 shrink-0" />
            <span className="min-w-0 sm:mt-1.5 sm:block">
              <span className="block truncate text-sm font-semibold leading-tight">{v.displayName}</span>
              <span className={`label-mono block ${selected ? 'text-[var(--route-deep)]' : 'text-muted'}`}>
                {soon ? 'Yakında' : capacityLabel(v)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
