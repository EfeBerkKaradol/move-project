import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Yük veren',
    links: [
      { href: '/fiyat-hesapla', label: 'Fiyat al' },
      { href: '/#araclar', label: 'Araç tipleri' },
      { href: '/#nasil-calisir', label: 'Nasıl çalışır' },
    ],
  },
  {
    title: 'Araç sahibi',
    links: [
      { href: '/sofor-ol', label: 'Şoför olarak katıl' },
      { href: '/#bos-donus', label: 'Boş dönüş eşleştirme' },
      { href: '/belgeler', label: 'Gerekli belgeler' },
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
    <footer className="theme-dark border-t border-line bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="label-mono text-muted">{col.title}</p>
              <ul className="mt-1">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {/* Dokunma hedefleri en az 44px (docs/01) */}
                    <Link
                      href={link.href}
                      className="block py-3.5 text-sm text-muted transition hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="label-mono mt-10 border-t border-line pt-6 text-muted">
          © {new Date().getFullYear()} Taşıyoruz · 81 il · Marka ve kurumsal kimlik geçicidir
        </p>
      </div>
    </footer>
  );
}
