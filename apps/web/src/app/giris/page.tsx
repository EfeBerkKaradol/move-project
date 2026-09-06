import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, homeFor, signIn } from '@/auth';
import { Shell } from '@/components/app/Shell';

export const metadata: Metadata = { title: 'Giriş yap' };

/**
 * Giriş Keycloak'a yönlendirir. Telefon + OTP, SMS sağlayıcısı bağlanınca
 * (ANAHTARLAR.md #2) Keycloak tarafında açılacak; bu sayfa değişmeyecek.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const target = params.callbackUrl && params.callbackUrl.startsWith('/') ? params.callbackUrl : null;
  if (session && session.error !== 'RefreshFailed') redirect(target ?? homeFor(session.roles));

  // Kimlik sağlayıcısı bağlı değilse (henüz dağıtılmamış ortam) sunucu hatası yerine
  // net bir mesaj: ziyaretçi neyin eksik olduğunu anlasın, site kırık görünmesin.
  if (!process.env.AUTH_KEYCLOAK_ISSUER || !process.env.AUTH_SECRET) {
    return (
      <Shell eyebrow="Hesap" title="Giriş bu ortamda henüz açık değil">
        <div className="max-w-md rounded-card border border-line bg-surface p-6 text-sm text-muted">
          <p>Kimlik servisi bu dağıtıma henüz bağlanmadı. Fiyat görmek için giriş gerekmiyor;
          ilan yayınlama ve teklif verme, kimlik servisi devreye girince açılacak.</p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-field px-3 font-semibold text-ink transition hover:bg-surface-2"
          >
            <span aria-hidden>←</span> Ana sayfaya dön
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell eyebrow="Hesap" title="Giriş yap">
      <div className="max-w-md rounded-card border border-line bg-surface p-6">
        <p className="text-sm text-muted">
          Fiyat görmek için giriş gerekmiyor. Hesap yalnızca ilan yayınlarken ve teklif verirken
          lazım.
        </p>
        <form
          className="mt-6"
          action={async () => {
            'use server';
            await signIn('keycloak', { redirectTo: target ?? '/giris' });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-field bg-amber px-6 py-4 font-bold text-[var(--amber-ink)] transition hover:bg-[var(--amber-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px"
          >
            Giriş yap
          </button>
        </form>

        {/* Kayıt aynı akış, yalnızca Keycloak'ın kayıt formuyla başlıyor */}
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm text-muted">Hesabın yok mu?</p>
          <form
            className="mt-2"
            action={async () => {
              'use server';
              await signIn('keycloak-signup', { redirectTo: target ?? '/giris' });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-field border border-line px-6 py-4 font-bold transition hover:border-amber"
            >
              Hesap oluştur
            </button>
          </form>
          <p className="mt-3 text-xs text-muted">
            Kayıt olan herkes yük veren olarak başlar. Araç sahibi olmak için belgelerini
            yükleyip onay alman gerekiyor —{' '}
            <Link href="/sofor-ol" className="underline underline-offset-2">şoför ol</Link>.
          </p>
        </div>

        <p className="label-mono mt-5 text-center text-muted">Telefon + tek kullanımlık kod yakında</p>
        <div className="mt-6 border-t border-line pt-4 text-center">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-field px-3 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <span aria-hidden>←</span> Ana sayfaya dön
          </Link>
        </div>
      </div>
    </Shell>
  );
}
