'use client';

/**
 * Kök düzenin kendisi çökerse devreye giren son çare.
 *
 * <p>Buradaki ağaçta düzen yok — kendi `html` ve `body` etiketlerini basmak zorunda.
 * Bu yüzden stiller de satır içi: global CSS'i yükleyen düzen zaten çalışmamış olabilir.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          background: '#0d1015',
          color: '#ffffff',
          display: 'grid',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          minHeight: '100vh',
          placeItems: 'center',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '32rem' }}>
          <p style={{ color: '#f49f2c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Taşıyoruz
          </p>
          <h1 style={{ fontSize: '1.8rem', lineHeight: 1.15, margin: '1rem 0 0' }}>
            Uygulama açılamadı.
          </h1>
          <p style={{ color: '#99a1aa', marginTop: '1rem' }}>
            Beklenmedik bir hata oluştu. Sayfayı yenilemeyi dene.
          </p>
          {error.digest && (
            <p style={{ color: '#99a1aa', fontFamily: 'monospace', marginTop: '0.75rem' }}>
              HATA NO · {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#f49f2c',
              border: 0,
              borderRadius: '0.75rem',
              color: '#0d1015',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 700,
              marginTop: '2rem',
              minHeight: '44px',
              padding: '0 1.25rem',
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
