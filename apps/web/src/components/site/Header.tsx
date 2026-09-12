import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, homeFor, isDriver, isOps, signOutEverywhere } from '@/auth';
import { BRAND } from '@/lib/brand';
import { HeaderShell } from './HeaderShell';
import { MobileMenu } from './MobileMenu';
import { Logo } from './Logo';

export async function Header({ overlay = false }: { overlay?: boolean } = {}) {
  const session = await auth();
  const signedIn = !!session && session.error !== 'RefreshFailed';
  const roles = session?.roles ?? [];

  // "Yük bul" araç sahibinin işi: sürücüyse doğrudan panele, değilse herkese açık
  // ilan panosuna. Önce başvuru sayfasına götürmek, ürünü hiç görmemiş birinden
  // belge yüklemesini istemek oluyordu; ilanları görüp sonra karar versin.
  const carrierHref = signedIn && isDriver(roles) ? '/nakliyeci' : '/ilanlar';

  /*
   * "İlanlar" ile "Yük bul" aynı veriyi gösteriyor ama aynı soruyu sormuyor,
   * o yüzden ikisi de duruyor ve AYRI adreslere gidiyor:
   *   İlanlar  — herkes için, düz liste ve süzgeç: "ne var burada?"
   *   Yük bul  — araç sahibi için: onaylıysa kendi paneli, değilse harita
   *              görünümü, yani "bana yakın ne var?"
   * İkisi de süzgeçsiz /ilanlar'a gitseydi menüde aynı yere çıkan iki madde
   * olurdu.
   */
  const nav = [
    { href: '/fiyat-hesapla', label: 'Yük ver' },
    { href: '/ilanlar', label: 'İlanlar' },
    { href: carrierHref === '/ilanlar' ? '/ilanlar?gorunum=harita' : carrierHref, label: 'Yük bul' },
    { href: '/#nasil-calisir', label: 'Nasıl çalışır' },
    { href: '/araclar', label: 'Araçlar' },
  ];

  // Dar ekranda çubuk yalnızca logo + tek eylem + menü taşıyor; geri kalanı menünün
  // içinde. 375 pikselde "Panelim", "Hesabım" ve "Çıkış"ı yan yana sığdırmaya
  // çalışmak hepsini okunmaz hâle getiriyordu.
  const account = signedIn
    ? [
        { href: homeFor(roles), label: isOps(roles) ? 'Operasyon' : isDriver(roles) ? 'Nakliyeci paneli' : 'Panelim' },
        { href: '/hesap', label: 'Hesabım' },
      ]
    : [{ href: '/giris', label: 'Giriş yap' }];

  const signOutForm = (
    <form
      action={async () => {
        'use server';
        redirect(await signOutEverywhere('/'));
      }}
    >
      <button
        type="submit"
        className="min-h-11 w-full rounded-field border border-line px-3.5 text-sm font-semibold transition hover:bg-surface-2"
      >
        Çıkış
      </button>
    </form>
  );

  return (
    <HeaderShell overlay={overlay}>
      <Link href="/" className="flex items-center gap-2.5 py-2 text-[15px] font-extrabold tracking-tight">
        <Logo className="size-7" />
        {BRAND.name}
      </Link>

      <nav aria-label="Ana menü" className="ml-8 hidden items-center gap-1 lg:flex">
        {nav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="inline-flex items-center rounded-lg px-3 py-2.5 text-sm text-muted transition hover:text-ink pointer-coarse:min-h-11"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {signedIn ? (
          <>
            <Link href={homeFor(roles)} className="inline-flex items-center px-3 py-2.5 text-sm font-semibold pointer-coarse:min-h-11">
              {isOps(roles) ? 'Operasyon' : isDriver(roles) ? 'Nakliyeci paneli' : 'Panelim'}
            </Link>
            <Link href="/hesap" className="hidden px-3 py-2.5 text-sm font-semibold text-muted transition hover:text-ink lg:inline-flex lg:items-center pointer-coarse:min-h-11">
              Hesabım
            </Link>
            <div className="hidden lg:block">
              <form
                action={async () => {
                  'use server';
                  redirect(await signOutEverywhere('/'));
                }}
              >
                <button
                  type="submit"
                  className="rounded-field border border-line px-3.5 py-2.5 text-sm font-semibold transition hover:bg-surface-2 pointer-coarse:min-h-11"
                >
                  Çıkış
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <Link href="/giris" className="hidden px-3 py-2.5 text-sm font-semibold lg:inline-flex lg:items-center pointer-coarse:min-h-11">
              Giriş yap
            </Link>
            <Link
              href="/fiyat-hesapla"
              className="inline-flex items-center rounded-field bg-route px-4 py-2.5 text-sm font-bold text-[var(--route-ink)] transition duration-150 hover:bg-[var(--route-hover)] active:translate-y-px pointer-coarse:min-h-11"
            >
              Yük ver
            </Link>
          </>
        )}

        <MobileMenu items={nav} account={account}>
          {signedIn ? signOutForm : null}
        </MobileMenu>
      </div>
    </HeaderShell>
  );
}
