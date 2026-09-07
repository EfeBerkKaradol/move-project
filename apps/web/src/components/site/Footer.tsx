import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { Logo } from './Logo';

const COLUMNS = [
  {
    title: 'Yük verenler',
    links: [
      { href: '/fiyat-hesapla', label: 'Fiyat al' },
      { href: '/#nasil-calisir', label: 'Nasıl çalışır' },
      { href: '/#araclar', label: 'Araç tipleri' },
    ],
  },
  {
    title: 'Araç sahipleri',
    links: [
      { href: '/sofor-ol', label: 'Şoför olarak katıl' },
      { href: '/belgeler', label: 'Gerekli belgeler' },
      { href: '/rotalar', label: 'Koridorlar' },
    ],
  },
  {
    title: 'Kurumsal',
    links: [
      { href: '/kurumsal', label: 'İşletmeler için' },
      { href: '/giris', label: 'Giriş yap' },
    ],
  },
  {
    title: 'Yasal',
    links: [
      { href: '/kvkk', label: 'KVKK aydınlatma metni' },
      { href: '/gizlilik-politikasi', label: 'Gizlilik politikası' },
      { href: '/kullanici-sozlesmesi', label: 'Kullanıcı sözleşmesi' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="theme-cream border-t border-line bg-bg">
      <div className="mx-auto max-w-[76rem] px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
          <div>
            <p className="flex items-center gap-2.5 text-[15px] font-extrabold tracking-tight">
              <Logo className="size-7" />
              {BRAND.name}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{BRAND.slogan}</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="label-mono text-muted">{column.title}</p>
                <ul className="mt-1">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {/* Dokunma hedefleri en az 44px (docs/01) */}
                      <Link
                        href={link.href}
                        className="block py-2.5 text-sm text-muted transition hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="label-mono mt-12 border-t border-line pt-6 text-muted">
          © {new Date().getFullYear()} {BRAND.name} · 81 il · Marka ve kurumsal kimlik geçicidir
        </p>
      </div>
    </footer>
  );
}
