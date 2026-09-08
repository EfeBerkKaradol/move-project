import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isCustomer, isDriver } from '@/auth';
import { Shell } from '@/components/app/Shell';
import { apiFetch } from '@/lib/api-server';
import { PhoneVerification } from './PhoneVerification';

export const metadata: Metadata = { title: 'Hesabım' };
export const dynamic = 'force-dynamic';

type PhoneStatus = { phone: string | null; verifiedAt: string | null; available: boolean };

/**
 * Hesap ayarları.
 *
 * <p>Eskiden burası yalnızca "rolün yok" mesajıydı ve rolü olan kullanıcı paneline
 * yönlendiriliyordu — yani normal kullanıcının hiç göremediği bir sayfaydı. Telefon
 * doğrulama herkesi ilgilendirdiği için sayfa gerçek bir hesap ekranına dönüştü;
 * rol uyarısı da rolü olmayana gösterilmeye devam ediyor.
 */
export default async function AccountPage() {
  const session = await auth();
  if (!canCallApi(session)) redirect('/giris?callbackUrl=/hesap');

  const roles = session.roles;
  const hasPanel = isDriver(roles) || isCustomer(roles);

  let phone: PhoneStatus = { phone: null, verifiedAt: null, available: false };
  try {
    phone = await apiFetch<PhoneStatus>('/me/phone');
  } catch {
    // API ulaşılamıyorsa sayfa yine açılsın: bileşen "şu an kapalı" diyor.
  }

  return (
    <Shell eyebrow="Hesap" title="Hesabım">
      <div className="grid max-w-2xl gap-5">
        <div className="rounded-card border border-line bg-surface p-6">
          <h2 className="text-lg font-bold">Giriş bilgilerin</h2>
          <p className="mt-2 text-sm text-muted">{session.user?.email}</p>
        </div>

        <PhoneVerification
          phone={phone.phone}
          verifiedAt={phone.verifiedAt}
          available={phone.available}
        />

        {!hasPanel && (
          <div className="rounded-card border border-line bg-surface p-6">
            <h2 className="text-lg font-bold">Hesabın henüz yetkilendirilmedi</h2>
            <p className="mt-2 text-sm text-muted">
              Hesabına henüz bir rol tanımlanmamış. Bu genelde geçici bir durumdur;
              yetkilendirildiğinde panelin açılır.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {hasPanel && (
            <Link href={homeFor(roles)} className="rounded-field bg-route px-5 py-3 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] active:translate-y-px">
              Panelime dön
            </Link>
          )}
          <Link href="/" className="rounded-field border border-line px-5 py-3 text-sm font-semibold transition hover:border-route hover:bg-surface-2">
            Ana sayfa
          </Link>
        </div>
      </div>
    </Shell>
  );
}
