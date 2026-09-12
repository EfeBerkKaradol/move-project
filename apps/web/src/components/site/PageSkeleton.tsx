import { BRAND } from '@/lib/brand';
import { Logo } from './Logo';

/**
 * Gezinme sırasında gösterilen ara ekran.
 *
 * <p><strong>Neden var:</strong> App Router'da bir `loading.tsx` yoksa `<Link>`
 * tıklaması sunucudan RSC cevabı gelene kadar <em>hiçbir şey</em> yapmıyor —
 * eski sayfa olduğu gibi duruyor. API uykudayken bu 6–12 saniye sürüyor ve
 * kullanıcıya düğme bozukmuş gibi görünüyor. Bu dosyanın varlığı Next'in sayfayı
 * bir Suspense sınırına sarmasını sağlıyor: tıklama anında geçiş başlıyor.
 *
 * <p>Başlık çubuğu burada oturum bilgisi taşımıyor; gerçek `Header` oturumu
 * beklediği için onu beklemek ara ekranı da geciktirirdi. Yükseklik
 * `HeaderShell` ile aynı (px-6 py-3) ki sayfa gelince çubuk yerinden oynamasın.
 *
 * @param cerceve Kendi çerçevesi olan bölümlerde (operasyon paneli `OpsShell`
 *   içinde açılıyor) çubuk çizilmemeli: layout zaten ekranda, ikinci bir başlık
 *   üst üste binerdi.
 */
export function PageSkeleton({ satir = 3, cerceve = true }: { satir?: number; cerceve?: boolean }) {
  return (
    <>
      {cerceve && (
        <header className="sticky top-0 z-50 border-b border-line bg-bg theme-cream">
          <div className="mx-auto flex max-w-[76rem] items-center gap-4 px-6 py-3">
            <span className="flex items-center gap-2 font-bold">
              <Logo className="h-7 w-7" />
              {BRAND.name}
            </span>
          </div>
        </header>
      )}
      <main className="theme-cream min-h-screen bg-bg text-ink" aria-busy="true">
        <div className="mx-auto max-w-[76rem] px-6 py-12 md:py-16">
          <span className="sr-only" role="status">
            Yükleniyor…
          </span>
          <div aria-hidden className="animate-pulse motion-reduce:animate-none">
            <div className="h-3 w-28 rounded-full bg-surface-2" />
            <div className="mt-5 h-10 w-2/3 max-w-md rounded-card bg-surface-2" />
            <div className="mt-4 h-4 w-full max-w-xl rounded-full bg-surface-2" />
            <div className="mt-2 h-4 w-4/5 max-w-lg rounded-full bg-surface-2" />
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: satir * 3 }, (_, i) => (
                <div key={i} className="h-28 rounded-card border border-line bg-surface" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
