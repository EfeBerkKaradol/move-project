import type { Metadata } from 'next';
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
            className="w-full rounded-field bg-amber px-6 py-4 font-bold text-[var(--amber-ink)] transition hover:brightness-105"
          >
            Giriş yap
          </button>
        </form>
        <p className="label-mono mt-4 text-center text-muted">Telefon + tek kullanımlık kod yakında</p>
      </div>
    </Shell>
  );
}
