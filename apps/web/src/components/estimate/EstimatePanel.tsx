'use client';

import { girisHref } from '@/lib/signup-role';
import type { Quote } from '@tasiyoruz/contracts';
import { estimateRange, formatPrice } from '@tasiyoruz/shared';
import Link from 'next/link';

const tl = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;

/** "alış noktası, yük tarifi ve araç tipi" — eksikleri okunur bir cümleye diziyor. */
function eksikCumlesi(eksikler: string[]): string {
  if (eksikler.length === 1) return eksikler[0];
  return `${eksikler.slice(0, -1).join(', ')} ve ${eksikler[eksikler.length - 1]}`;
}

/**
 * Tahmini fiyat aralığı. Tek bir rakam değil aralık gösteriyoruz: platform fiyat
 * dayatmıyor, kesin fiyatı araç sahipleri teklifle veriyor (docs/11 §2). Tarife dökümü
 * yine de açık — kullanıcı aralığın neye dayandığını görebilmeli.
 *
 * <p>Panel aynı zamanda formun kontrol listesi: eksik olan tam olarak yazılıyor.
 * Gerekçesiz gri bir düğme, kullanıcıyı neyi atladığını arayarak sayfada
 * dolaştırıyor.
 */
export function EstimatePanel({
  quote,
  loading,
  error,
  missing,
  vehicleName,
  publishHref,
  signedIn,
}: {
  quote: Quote | null;
  loading: boolean;
  error: string | null;
  /** Tahmin için eksik olanlar; boşsa hesaplanabilir. */
  missing: string[];
  vehicleName: string | null;
  /** Seçim URL'e yazılarak ilan sayfasına taşınır. */
  publishHref: string;
  signedIn: boolean;
}) {
  const ready = missing.length === 0;
  /*
   * Üye olmayan kullanıcı doğrudan girişe gönderiliyor. Middleware zaten
   * yönlendiriyor ama düğme "İlanı yayınla" deyip kayıt ekranı açıyordu; ne
   * olacağını önceden söylemek, kullanıcıyı beklemediği bir kapıya çarpmaktan
   * iyi. Seçim callbackUrl'de duruyor, girişten sonra aynı adrese dönülüyor.
   */
  // Buradan gelen herkes yük veren: kayıt ekranı belge değil ilan akışını anlatsın
  const href = signedIn ? publishHref : girisHref('yuk-veren', publishHref);

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

          <details className="mt-5 rounded-field border border-line bg-surface-2 px-4 py-3 transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25">
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
      ) : ready ? (
        <p className="mt-3 text-sm text-muted">Hesaplanıyor…</p>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-muted">
            Tahmin, yükün tarifi tamamlanınca çıkıyor — eksik beyanla verilen rakam tutmuyor.
          </p>
          <p className="mt-3 text-sm">
            <span className="label-mono text-muted">Eksik </span>
            <span className="font-semibold">{eksikCumlesi(missing)}</span>
          </p>
          <p className="label-mono mt-3 text-muted">Kayıt gerekmez</p>
        </div>
      )}

      <Link
        href={href}
        aria-disabled={!ready}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-field bg-route px-6 py-4 font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px ${
          ready ? '' : 'pointer-events-none opacity-50'
        }`}
      >
        {signedIn ? 'İlanı yayınla, teklif al' : 'Üye ol ve ilanı yayınla'}
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2.5 8h11M9.5 4.5 13 8l-3.5 3.5" />
        </svg>
      </Link>
      <p className="label-mono mt-3 text-center text-muted">
        {signedIn ? 'Teslimatta ödeme · Komisyon dahil' : 'Kayıt bu adımda istenir · Teslimatta ödeme'}
      </p>
    </aside>
  );
}
