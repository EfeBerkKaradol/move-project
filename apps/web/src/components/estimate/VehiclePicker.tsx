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
              // Sıkı kart: yedi araç üç satır tutuyor ve hero'daki widget bu yüzden
              // ekrana sığmayıp kendi içinde kayıyordu. Bilgi aynı, çevresi dar.
              'rounded-field border p-2.5 text-left transition',
              soon
                ? 'cursor-not-allowed border-dashed border-line text-muted'
                : selected
                  ? 'border-route bg-[var(--route-soft)]'
                  : 'border-line bg-surface hover:border-muted',
            ].join(' ')}
          >
            <VehicleGlyph code={v.code} className="size-5" />
            <span className="mt-1.5 block text-sm leading-tight font-semibold">{v.displayName}</span>
            <span className={`label-mono block ${selected ? 'text-[var(--route-deep)]' : 'text-muted'}`}>
              {soon ? 'Yakında' : capacityLabel(v)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
