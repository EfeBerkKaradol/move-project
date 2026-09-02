'use client';

/**
 * Adet seçici. Artış/azalış **delta** olarak bildirilir, mutlak değer olarak değil —
 * böylece ardışık tıklamalarda React batch'lemesi bir güncellemeyi ezemez.
 * Dokunma hedefleri mobilde de rahat kullanılacak boyutta (≥44px).
 */
export function Stepper({
  value,
  onDelta,
  label,
  max = 99,
}: {
  value: number;
  onDelta: (delta: number) => void;
  label: string;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`${label} adedini azalt`}
        disabled={value <= 0}
        onClick={() => onDelta(-1)}
        className="size-11 rounded-lg border border-line text-lg leading-none disabled:opacity-35"
      >
        −
      </button>
      <output
        aria-label={`${label} adedi`}
        className="w-9 text-center text-sm tabular-nums font-medium"
      >
        {value}
      </output>
      <button
        type="button"
        aria-label={`${label} adedini artır`}
        disabled={value >= max}
        onClick={() => onDelta(1)}
        className="size-11 rounded-lg border border-line text-lg leading-none disabled:opacity-35"
      >
        +
      </button>
    </div>
  );
}
