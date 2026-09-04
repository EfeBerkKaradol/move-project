'use client';

import type { VehicleRecommendation, VehicleType } from '@turmove/contracts';
import { formatVolume } from '@turmove/shared';

const EXTRA_LABELS: Record<string, string> = {
  PORTERAGE: 'Hamaliye',
  TARPAULIN: 'Branda',
  STRAPPING: 'Kayış / sabitleme',
  PACKAGING: 'Ambalaj',
};

/**
 * Öneri, gerekçesiyle birlikte gösterilir. "Transporter" demek yetmez — kullanıcı
 * neden Doblo olmadığını anlamalı, yoksa daha ucuzunu seçer ve iş bozulur (docs/08 §6).
 */
export function RecommendationPanel({
  recommendation,
  loading,
  error,
  vehicleTypes,
  overrideCode,
  onOverride,
}: {
  recommendation: VehicleRecommendation | null;
  loading: boolean;
  error: string | null;
  vehicleTypes: VehicleType[];
  overrideCode: string | null;
  onOverride: (code: string | null) => void;
}) {
  if (error) {
    return (
      <aside className="rounded-card border border-line bg-surface p-6">
        <p className="text-sm text-muted">{error}</p>
      </aside>
    );
  }

  if (!recommendation) {
    return (
      <aside className="rounded-card border border-dashed border-line p-6">
        <p className="text-sm text-muted">
          Yükünüzü tarif edin, uygun aracı hesaplayıp gerekçesiyle önerelim.
        </p>
      </aside>
    );
  }

  const { estimate, primary, alternatives, suggestedExtras } = recommendation;
  const chosen = overrideCode
    ? (vehicleTypes.find((v) => v.code === overrideCode) ?? null)
    : null;
  const tooSmall =
    chosen !== null &&
    (chosen.volumeM3 < estimate.volumeM3 ||
      chosen.payloadKg < estimate.weightKg ||
      chosen.innerLengthCm < estimate.longestEdgeCm);

  return (
    <aside
      aria-live="polite"
      className={['space-y-4', loading ? 'opacity-60 transition-opacity' : ''].join(' ')}
    >
      <div className="rounded-card border-2 border-amber bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Önerimiz
        </p>
        <h3 className="mt-1.5 text-2xl font-bold tracking-tight">{primary.displayName}</h3>

        <FillGauge percent={primary.fillRatePercent} />

        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Hacim</dt>
            <dd className="tabular-nums font-medium">{formatVolume(estimate.volumeM3)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Ağırlık</dt>
            <dd className="tabular-nums font-medium">
              {estimate.weightKg.toLocaleString('tr-TR')} kg
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">En uzun parça</dt>
            <dd className="tabular-nums font-medium">
              {estimate.longestEdgeCm.toLocaleString('tr-TR')} cm
            </dd>
          </div>
        </dl>

        {primary.whyNotSmaller && (
          <p className="mt-4 border-l-2 border-line pl-3 text-sm text-muted">
            {primary.whyNotSmaller.reason}
          </p>
        )}
      </div>

      {alternatives.length > 0 && (
        <div className="rounded-card border border-line bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Alternatifler
          </p>
          <ul className="mt-3 space-y-2">
            {alternatives.map((a) => (
              <li key={a.vehicleTypeCode} className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{a.displayName}</span>
                <span className="tabular-nums text-xs text-muted">
                  %{a.fillRatePercent} dolu
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestedExtras.length > 0 && (
        <div className="rounded-card border border-line bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Önerilen ek hizmet
          </p>
          <ul className="mt-3 space-y-2">
            {suggestedExtras.map((e) => (
              <li key={e.code} className="text-sm">
                <span className="font-medium">{EXTRA_LABELS[e.code] ?? e.code}</span>
                <span className="block text-xs text-muted">{e.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded-card border border-line bg-surface p-5">
        <summary className="cursor-pointer text-sm font-medium">
          Başka bir araç seçmek istiyorum
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onOverride(null)}
            className={[
              'rounded-lg border px-3 py-2 text-sm',
              overrideCode === null ? 'border-amber bg-[var(--amber-soft)]' : 'border-line',
            ].join(' ')}
          >
            Öneriyi kullan
          </button>
          {vehicleTypes.map((v) => (
            <button
              key={v.code}
              type="button"
              onClick={() => onOverride(v.code)}
              className={[
                'rounded-lg border px-3 py-2 text-sm',
                overrideCode === v.code ? 'border-amber bg-[var(--amber-soft)]' : 'border-line',
              ].join(' ')}
            >
              {v.displayName}
            </button>
          ))}
        </div>
        {tooSmall && chosen && (
          <p className="mt-3 rounded-lg border border-line bg-bg px-3 py-2 text-sm">
            <strong>{chosen.displayName}</strong> bu yük için yeterli değil
            {chosen.innerLengthCm < estimate.longestEdgeCm
              ? ` — ${estimate.longestEdgeCm} cm'lik parça ${chosen.innerLengthCm} cm'lik kasaya girmiyor.`
              : chosen.payloadKg < estimate.weightKg
                ? ` — ${estimate.weightKg} kg yük ${chosen.payloadKg} kg kapasiteyi aşıyor.`
                : ` — ${formatVolume(estimate.volumeM3)} yük ${formatVolume(chosen.volumeM3)} kasaya sığmıyor.`}{' '}
            Nakliyeci işi reddedebilir.
          </p>
        )}
      </details>
    </aside>
  );
}

/** Doluluk göstergesi bu ekranın kalbi: kullanıcı m³ okumaz, dolu bir çubuk görür. */
function FillGauge({ percent }: { percent: number }) {
  const clamped = Math.min(percent, 100);
  const tight = percent > 95;
  return (
    <div className="mt-4">
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
        role="img"
        aria-label={`Yükünüz aracın yüzde ${percent}'ini dolduruyor`}
      >
        <div
          className={['h-full rounded-full transition-all', tight ? 'bg-amber' : 'bg-amber'].join(
            ' ',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted">
        Yükünüz aracın <span className="tabular-nums font-medium text-ink">%{percent}</span>
        &apos;ini dolduruyor
        {tight && ' — sınırda, bir üst aracı düşünün'}
      </p>
    </div>
  );
}
