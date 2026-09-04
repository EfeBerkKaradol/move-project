import Link from 'next/link';
import { CITIES } from '@turmove/shared';

const COLUMNS = [
  {
    title: 'Hizmetler',
    links: [
      { href: '/fiyat-hesapla', label: 'Anlık taşıma' },
      { href: '/fiyat-hesapla', label: 'Planlı taşıma' },
      { href: '/#filo', label: 'Araç tipleri' },
    ],
  },
  {
    title: 'Kurumsal',
    links: [
      { href: '/#pano', label: 'Güven panosu' },
      { href: '/#sehirler', label: 'Hizmet bölgeleri' },
      { href: '/#nakliyeci', label: 'Nakliyeci ol' },
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
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-lg font-extrabold">TurMove</p>
            <p className="mt-2 max-w-xs text-sm text-ink-muted">
              Ne taşıyacağını söyle, aracı biz bulalım. {CITIES.map((c) => c.name).join(' · ')}.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {col.title}
              </p>
              {/* Dokunma hedefleri en az 44px: py-2.5 + satır yüksekliği (docs/01) */}
              <ul className="mt-1">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="block py-3.5 text-sm text-ink-muted transition hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 border-t border-line pt-6 text-xs text-ink-muted">
          © {new Date().getFullYear()} TurMove · Marka adı ve kurumsal kimlik geçicidir.
        </p>
      </div>
    </footer>
  );
}
