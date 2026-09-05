'use client';

import type { Quote } from '@tasiyoruz/contracts';
import { estimateRange, formatPrice } from '@tasiyoruz/shared';
import Link from 'next/link';

const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;

/**
 * Tahmini fiyat aralığı. Tek bir rakam değil aralık gösteriyoruz: platform fiyat
 * dayatmıyor, kesin fiyatı araç sahipleri teklifle veriyor (docs/11 §2). Tarife dökümü
 * yine de açık — kullanıcı aralığın neye dayandığını görebilmeli.
 */
export function EstimatePanel({
  quote,
  loading,
  error,
  ready,
  vehicleName,
}: {
  quote: Quote | null;
  loading: boolean;
  error: string | null;
  /** Rota ve araç seçildi mi — boş durum metni buna göre değişir. */
  ready: boolean;
  vehicleName: string | null;
}) {
  return (
    <aside
      aria-live="polite"
      className={`rounded-card border border-line bg-surface p-5 sm:p-6 ${loading ? 'opacity-60 transition-opacity' : ''}`}
    >
      <p className="label-mono text-muted">Tahmini fiyat aralığı</p>

      {quote ? (
        <>
          <p className="stat mt-3 whitespace-nowrap text-[clamp(1.4rem,2.1vw,1.9rem)] leading-none text-ink">
            [{estimateRange(quote.totalAmount.amount).low.toLocaleString('tr-TR')} –{' '}
            {tl(estimateRange(quote.totalAmount.amount).high)}]
          </p>
          <p className="label-mono mt-3 text-muted">
            {vehicleName} · {(quote.distanceMeters / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} km ·{' '}
            {Math.round(quote.durationSeconds / 60)} dk
            {quote.approximateDistance && ' · takribî mesafe'}
          </p>

          <details className="mt-5 rounded-field border border-line bg-surface-2 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Tarife dökümü — {formatPrice(quote.totalAmount.amount)}
            </summary>
            <dl className="mt-3 space-y-2">
              {quote.breakdown.map((line) => (
                <div key={line.code}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <dt>{line.label}</dt>
                    <dd className="tabular-nums font-medium">{formatPrice(line.amount.amount)}</dd>
                  </div>
                  {line.note && (
                    <p className="mt-0.5 border-l-2 border-line pl-2 text-xs text-muted">{line.note}</p>
                  )}
                </div>
              ))}
            </dl>
          </details>

          <p className="mt-4 text-sm text-muted">
            Aralık, sözleşmeli tarifeden türetilmiş bir tahmin. Kesin fiyatı ilanına teklif
            veren araç sahipleri belirler; puanlarını ve tamamladıkları işleri yan yana görürsün.
          </p>
        </>
      ) : error ? (
        <div className="mt-3">
          <p className="text-sm font-semibold">Tahmin hesaplanamadı.</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {ready
            ? 'Hesaplanıyor…'
            : 'Nereden, nereye ve araç tipini seç — tahmin burada görünür. Kayıt gerekmez.'}
        </p>
      )}

      <Link
        href="/giris"
        aria-disabled={!ready}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-field bg-amber px-6 py-4 font-bold text-[var(--amber-ink)] transition hover:brightness-105 ${
          ready ? '' : 'pointer-events-none opacity-50'
        }`}
      >
        İlanı yayınla, teklif al
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2.5 8h11M9.5 4.5 13 8l-3.5 3.5" />
        </svg>
      </Link>
      <p className="label-mono mt-3 text-center text-muted">
        Kayıt bu adımda istenir · Teslimatta ödeme · Komisyon dahil
      </p>
    </aside>
  );
}
