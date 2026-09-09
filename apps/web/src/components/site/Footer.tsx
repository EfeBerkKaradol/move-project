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
      { href: '/legal/kullanici-sozlesmesi', label: 'Kullanıcı sözleşmesi' },
      { href: '/legal/gonderici-sozlesmesi', label: 'Gönderici sözleşmesi' },
      { href: '/legal/tasiyici-sozlesmesi', label: 'Taşıyıcı sözleşmesi' },
      { href: '/legal/kvkk-aydinlatma', label: 'KVKK aydınlatma' },
      { href: '/legal/gizlilik', label: 'Gizlilik politikası' },
      { href: '/legal/cerez-politikasi', label: 'Çerez politikası' },
    ],
  },
  {
    // Yasaklı eşyalar ve ihlal bildirimi ayrı başlık altında: bunlar sözleşme
    // metni değil, kullanıcının iş yaparken ihtiyaç duyduğu kurallar. Yasal
    // listenin dibine gömüldüklerinde kimse açmıyordu.
    title: 'Kurallar',
    links: [
      { href: '/legal/yasakli-esyalar', label: 'Yasaklı eşyalar' },
      { href: '/legal/hukuka-aykiri-kullanim', label: 'Hukuka aykırı kullanım' },
      { href: '/legal/iptal-iade', label: 'İptal ve iade' },
      { href: '/legal/ihlaller-ve-sikayetler', label: 'İhlal bildirimi' },
      { href: '/#sss', label: 'Sıkça sorulanlar' },
      { href: '/legal', label: 'Tüm yasal belgeler' },
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
                        className="flex items-center py-2.5 text-sm text-muted transition hover:text-ink pointer-coarse:min-h-11"
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

        <div className="mt-12 border-t border-line pt-6">
          <p className="label-mono text-muted">
            © {new Date().getFullYear()} {BRAND.name} · 81 il · Marka ve kurumsal kimlik geçicidir
          </p>
          {/* Hero'daki haritalar OSM türevi sınır verisinden üretiliyor; ODbL ve
              CC BY 4.0 atıf istiyor (bkz. components/hero/geo-data.ts). */}
          <p className="label-mono mt-2 text-muted opacity-70">
            Harita verisi ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener"
              className="underline underline-offset-2 hover:text-ink">
              OpenStreetMap
            </a>{' '}
            katkıcıları · geoBoundaries (CC BY 4.0)
          </p>
        </div>
      </div>
    </footer>
  );
}
