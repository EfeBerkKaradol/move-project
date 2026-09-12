import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, homeFor, signIn } from '@/auth';
import { Shell } from '@/components/app/Shell';
import { PendingButton } from '@/components/ui/PendingButton';
import { girisHref, otherRole, roleCopy } from '@/lib/signup-role';

export const metadata: Metadata = { title: 'Giriş yap' };

/** Bekleme uzayınca gösterilen açıklama — kullanıcı neden beklediğini bilsin. */
const WAKE_HINT = 'Kimlik sunucusu uyandırılıyor; ilk açılışta bir dakika kadar sürebilir.';

/**
 * Giriş Keycloak'a yönlendirir. Telefon + OTP, SMS sağlayıcısı bağlanınca
 * (ANAHTARLAR.md #2) Keycloak tarafında açılacak; bu sayfa değişmeyecek.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; rol?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const target = params.callbackUrl && params.callbackUrl.startsWith('/') ? params.callbackUrl : null;
  if (session && session.error !== 'RefreshFailed') redirect(target ?? homeFor(session.roles));

  /*
   * Kim geldiği NEREDEN geldiğinden belli: "Yük ver" düğmesi yük verenden,
   * "Yük bul" araç sahibinden gelir. Tek bir kayıt ekranı ikisine de aynı şeyi
   * anlatıyordu — yükü olan kişiye belge yüklemekten söz ediliyor, aracı olan
   * kişiye kayıttan sonra ne yapacağı hiç söylenmiyordu.
   *
   * Rol bir yetki değil: Keycloak yeni kaydolan herkese CUSTOMER veriyor,
   * taşıyıcılık ancak belgeler onaylanınca açılıyor. Buradaki seçim, kullanıcının
   * nereye ineceği ve ona ne anlatıldığı.
   */
  const copy = roleCopy(params.rol);
  const diger = otherRole(copy.role);
  const varis = target ?? copy.landing;

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
    <Shell eyebrow="Hesap" title={copy.title}>
      <div className="max-w-md rounded-card border border-line bg-surface p-6">
        <p className="text-sm text-muted">{copy.lead}</p>

        {/* Kayıttan sonra ne isteneceği ÖNCEDEN yazıyor. Araç sahibi belge
            yükleyeceğini kaydolduktan sonra öğrendiğinde yarıda bırakıyordu. */}
        <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-muted">
          {copy.next.map((satir) => (
            <li key={satir} className="flex gap-2">
              <span aria-hidden className="text-[var(--route-deep)]">·</span>
              <span>{satir}</span>
            </li>
          ))}
        </ul>
        <form
          className="mt-6"
          action={async () => {
            'use server';
            await signIn('keycloak', { redirectTo: varis });
          }}
        >
          {/* Kimlik servisi uykudan uyanıyorsa yönlendirme bir dakikayı bulabiliyor;
              düğme bu süre boyunca sessiz kalınca "çalışmıyor" sanılıyordu. */}
          <PendingButton
            pendingLabel="Giriş sayfası açılıyor…"
            slowHint={WAKE_HINT}
            className="w-full rounded-field bg-route px-6 py-4 font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px"
          >
            Giriş yap
          </PendingButton>
        </form>

        {/* Kayıt aynı akış, yalnızca Keycloak'ın kayıt formuyla başlıyor */}
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm text-muted">Hesabın yok mu?</p>
          <form
            className="mt-2"
            action={async () => {
              'use server';
              await signIn('keycloak-signup', { redirectTo: varis });
            }}
          >
            <PendingButton
              pendingLabel="Kayıt formu açılıyor…"
              slowHint={WAKE_HINT}
              className="w-full rounded-field border border-line px-6 py-4 font-bold transition hover:border-route"
            >
              {copy.signupLabel}
            </PendingButton>
          </form>
          {/* Yanlış kapıdan gelen kullanıcı buradan karşı akışa geçiyor;
              seçimi callbackUrl'i korumadan taşımak, doldurduğu formu
              kaybettirirdi. */}
          <p className="mt-3 text-xs text-muted">
            <Link href={girisHref(diger.role, target)} className="underline underline-offset-2">
              {diger.switchLabel}
            </Link>
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
