'use client';

import type { Quote } from '@turmove/contracts';
import { formatPrice } from '@turmove/shared';

/**
 * Fiyat dökümü. Her kalem ayrı satır, gizli kalem yok (FR-5.5) —
 * kullanıcı ne için ne ödediğini görmeden sipariş vermez.
 */
export function PricePanel({
  quote,
  loading,
  error,
  onNegotiate,
}: {
  quote: Quote | null;
  loading: boolean;
  error: string | null;
  onNegotiate: () => void;
}) {
  if (error) {
    return (
      <div className="rounded-card border border-line bg-surface p-5">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="rounded-card border border-dashed border-line p-5">
        <p className="text-sm text-ink-muted">
          Alış ve teslim ilçesini seçin, fiyatı hesaplayalım.
        </p>
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className={['rounded-card border border-line bg-surface p-5', loading ? 'opacity-60' : ''].join(
        ' ',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">Fiyat</p>
        <p className="tabular-nums text-xs text-ink-muted">
          {(quote.distanceMeters / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} km ·{' '}
          {Math.round(quote.durationSeconds / 60)} dk
        </p>
      </div>

      <dl className="mt-4 space-y-2">
        {quote.breakdown.map((line) => (
          <div key={line.code}>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm">{line.label}</dt>
              <dd className="tabular-nums text-sm font-medium">
                {formatPrice(line.amount.amount)}
              </dd>
            </div>
            {line.note && (
              <p className="mt-0.5 border-l-2 border-line pl-2 text-xs text-ink-muted">
                {line.note}
              </p>
            )}
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
        <span className="font-semibold">Toplam</span>
        <span className="tabular-nums text-2xl font-bold">
          {formatPrice(quote.totalAmount.amount)}
        </span>
      </div>

      <div className="mt-5 space-y-2">
        <button
          type="button"
          className="w-full rounded-pill bg-primary px-6 py-3 font-medium text-primary-fg"
        >
          Hemen sipariş ver
        </button>
        <button
          type="button"
          onClick={onNegotiate}
          className="w-full rounded-pill border border-line px-6 py-3 text-sm font-medium"
        >
          Pazarlık yap
          <span className="block text-xs font-normal text-ink-muted">
            En düşük teklif {formatPrice(quote.floorPrice.amount)} · ~6 dk sürer
          </span>
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-ink-muted">
        Sipariş ve pazarlık akışı sıradaki adımda devreye girecek.
      </p>
    </div>
  );
}
