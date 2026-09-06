'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Sayfa çökerse gösterilen ekran.
 *
 * <p>Bu dosya olmadan Next kendi ham ekranını basıyordu: "Application error: a
 * server-side exception has occurred" ve bir sayı. Ziyaretçi ne olduğunu da ne
 * yapacağını da anlamıyordu.
 *
 * <p>Hata metni gösterilmiyor, yalnızca `digest` gösteriliyor: sunucu hatalarının
 * içeriği sorgu, dosya yolu ya da kimlik taşıyabilir. Destek kaydını bu numarayla
 * eşleştirmek yeterli.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sunucu günlüğüne zaten düştü; tarayıcı konsolu geliştirici için
    console.error(error);
  }, [error]);

  return (
    <main className="theme-dark grid min-h-screen place-items-center bg-bg px-6">
      <div className="max-w-lg text-center">
        <p className="label-mono text-amber">Bir şeyler ters gitti</p>
        <h1 className="mt-4 text-[clamp(1.8rem,5vw,2.6rem)] leading-[1.08]">
          Sayfa yüklenemedi.
        </h1>
        <p className="mt-5 text-muted">
          Geçici bir sorun olabilir. Tekrar dene; sürerse bu numarayla bize yaz.
        </p>
        {error.digest && (
          <p className="label-mono mt-3 text-muted">HATA NO · {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-field bg-amber px-5 py-3 text-sm font-bold text-[var(--amber-ink)] transition hover:bg-[var(--amber-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px"
          >
            Tekrar dene
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-field border border-line px-5 text-sm font-semibold transition hover:border-amber hover:bg-surface-2"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </main>
  );
}
