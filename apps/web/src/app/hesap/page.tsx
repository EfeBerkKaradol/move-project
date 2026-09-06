import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, isCustomer, isDriver } from '@/auth';
import { Shell } from '@/components/app/Shell';

export const metadata: Metadata = { title: 'Hesabım' };
export const dynamic = 'force-dynamic';

/**
 * Rolü olmayan kullanıcının indiği sayfa. Normalde buraya kimse düşmez —
 * kaydolan herkes CUSTOMER alır — ama rol elle kaldırılırsa kullanıcı
 * panelller arasında döngüye girmek yerine burada net bir açıklama görür.
 */
export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect('/giris');
  const roles = session.roles;
  if (isDriver(roles) || isCustomer(roles)) redirect(isDriver(roles) ? '/nakliyeci' : '/panel');

  return (
    <Shell eyebrow="Hesap" title="Hesabın henüz yetkilendirilmedi">
      <div className="max-w-lg rounded-card border border-line bg-surface p-6">
        <p className="text-sm text-muted">
          {session.user?.email} ile giriş yaptın ama hesabına henüz bir rol tanımlanmamış.
          Bu genelde geçici bir durumdur; destek ekibi hesabını yetkilendirdiğinde panelin açılır.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/fiyat-hesapla" className="rounded-field bg-amber px-5 py-3 text-sm font-bold text-[var(--amber-ink)] transition hover:bg-[var(--amber-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px">
            Fiyat hesapla
          </Link>
          <Link href="/" className="rounded-field border border-line px-5 py-3 text-sm font-semibold transition hover:border-amber hover:bg-surface-2">
            Ana sayfa
          </Link>
        </div>
      </div>
    </Shell>
  );
}
