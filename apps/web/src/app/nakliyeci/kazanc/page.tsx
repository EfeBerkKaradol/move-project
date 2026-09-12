import { PAYOUT_STATUS_LABELS, type PayoutStatus, type PayoutView, type TripView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isDriver } from '@/auth';
import { Shell } from '@/components/app/Shell';
import { SubNav } from '@/components/app/SubNav';
import { apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Kazançlarım' };
export const dynamic = 'force-dynamic';

/**
 * Durumun taşıyıcıya ne anlattığı.
 *
 * <p>Etiket yetmiyor: "Ödenmeye hazır" ile "Ödendi" arasındaki farkı bilmeyen
 * taşıyıcı parasının nerede olduğunu soruyor. Her durum, o durumda ne beklemesi
 * gerektiğini de söylüyor.
 */
const DURUM_ACIKLAMA: Record<PayoutStatus, string> = {
  PENDING: 'İş tamamlanınca ödenmeye hazır hâle gelir.',
  ELIGIBLE: 'Hakediş kesinleşti. Ödeme altyapısı bağlandığında aktarılacak.',
  PROCESSING: 'Ödeme gönderildi, sağlayıcıdan onay bekleniyor.',
  PAID: 'Hesabına aktarıldı.',
  FAILED: 'Aktarım başarısız oldu. Operasyon ekibi inceliyor.',
  ON_HOLD: 'İade ya da itiraz nedeniyle beklemede. Tutar yeniden değerlendiriliyor.',
};

/** Beklemede duran para: henüz ödenmemiş ama kazanılmış olabilecek hakedişler. */
const BEKLEYEN: PayoutStatus[] = ['PENDING', 'ELIGIBLE', 'PROCESSING', 'ON_HOLD'];

const topla = (l: { net: { amount: string } }[]) =>
  l.reduce((t, x) => t + Number(x.net.amount), 0);

/**
 * Araç sahibinin kazancı — hakediş kayıtlarından.
 *
 * <p>Önce tamamlanmış işlerin anlaşılan tutarları toplanıyordu. O rakam "ne
 * kazandım" sorusunu cevaplıyordu ama "param nerede" sorusunu cevaplamıyordu:
 * komisyon görünmüyordu, ödenmiş ile ödenmemiş ayrılmıyordu. Artık kaynak
 * hakediş kaydının kendisi; brüt, komisyon ve net ayrı ayrı duruyor.
 *
 * <p><strong>Ödeme altyapısı henüz bağlı değil</strong> ve bu saklanmıyor:
 * hakedişler ELIGIBLE'da bekliyor, "ödendi" yazmıyor.
 */
export default async function DriverEarningsPage() {
  const session = await auth();
  if (!canCallApi(session)) redirect('/giris');
  if (!isDriver(session.roles)) redirect(homeFor(session.roles));

  const [payouts, trips] = await Promise.all([
    apiFetch<PayoutView[]>('/driver/payouts').catch(() => [] as PayoutView[]),
    // İş sayısı ve tarih dökümü için; hakediş kaydı işin kendisini taşımıyor
    apiFetch<TripView[]>('/driver/trips').catch(() => [] as TripView[]),
  ]);

  const odenen = payouts.filter((p) => p.status === 'PAID');
  const bekleyen = payouts.filter((p) => BEKLEYEN.includes(p.status));
  const brutToplam = payouts.reduce((t, p) => t + Number(p.gross.amount), 0);
  const komisyonToplam = payouts.reduce((t, p) => t + Number(p.commission.amount), 0);

  // Duruma göre grupla; sıra kullanıcının ilgi sırası: önce para nerede takıldı
  const siralama: PayoutStatus[] = ['ON_HOLD', 'FAILED', 'PROCESSING', 'ELIGIBLE', 'PENDING', 'PAID'];
  const gruplar = siralama
    .map((durum) => ({ durum, kayitlar: payouts.filter((p) => p.status === durum) }))
    .filter((g) => g.kayitlar.length > 0);

  const nav = (
    <SubNav
      items={[
        { href: '/nakliyeci', label: 'Açık ilanlar' },
        { href: '/nakliyeci/koridor', label: 'Boş dönüş' },
        { href: '/nakliyeci/isler', label: 'İşlerim' },
        { href: '/nakliyeci/teklifler', label: 'Tekliflerim' },
        { href: '/sofor-ol', label: 'Belgelerim' },
      ]}
      className="-ml-3"
    />
  );

  if (payouts.length === 0) {
    return (
      <Shell eyebrow="Araç sahibi" title="Kazançlarım">
        {nav}
        <div className="mt-6 rounded-card border border-dashed border-line p-8 text-center">
          <p className="font-semibold">Henüz hakediş kaydın yok.</p>
          <p className="mt-1 text-sm text-muted">
            {trips.length > 0
              ? 'İşlerin var ama hakediş kaydı yalnızca iş sana verildikten sonra açılıyor.'
              : 'İlk işini aldığında hakediş burada açılır.'}
          </p>
          <Link
            href="/nakliyeci"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-field bg-route px-5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] active:translate-y-px"
          >
            Açık ilanlara bak
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell eyebrow="Araç sahibi" title="Kazançlarım">
      {nav}

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-[var(--route-deep)] bg-[var(--route-soft)] p-5">
          <dt className="label-mono text-muted">Bekleyen hakediş</dt>
          <dd className="stat mt-2 text-[1.75rem] leading-none">
            {formatPrice(String(topla(bekleyen)))}
          </dd>
          <p className="label-mono mt-2 text-muted">{bekleyen.length} iş</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-5">
          <dt className="label-mono text-muted">Ödenen</dt>
          <dd className="stat mt-2 text-[1.75rem] leading-none">
            {formatPrice(String(topla(odenen)))}
          </dd>
          <p className="label-mono mt-2 text-muted">{odenen.length} iş</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-5">
          <dt className="label-mono text-muted">Toplam taşıma bedeli</dt>
          <dd className="stat mt-2 text-[1.75rem] leading-none">
            {formatPrice(String(brutToplam))}
          </dd>
          {/* Komisyon açıkça yazıyor: hakedişle taşıma bedeli arasındaki farkı
              taşıyıcının hesaplaması gerekmesin */}
          <p className="label-mono mt-2 text-muted">
            {komisyonToplam > 0
              ? `${formatPrice(String(komisyonToplam))} komisyon düşüldü`
              : 'komisyon alınmadı'}
          </p>
        </div>
      </dl>

      {gruplar.map(({ durum, kayitlar }) => (
        <section key={durum} className="mt-8">
          <h2 className="text-base font-bold">
            {PAYOUT_STATUS_LABELS[durum]}
            <span className="label-mono ml-2 font-normal text-muted">{kayitlar.length}</span>
          </h2>
          <p className="mt-1 text-sm text-muted">{DURUM_ACIKLAMA[durum]}</p>

          <ul className="mt-3 overflow-hidden rounded-card border border-line bg-surface">
            {kayitlar.map((p, i) => (
              <li
                key={p.id}
                className={`flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-4 ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <Link
                  href={`/nakliyeci/ilan/${p.listingId}`}
                  className="font-semibold underline-offset-4 hover:underline"
                >
                  İlanı gör
                </Link>
                <span className="label-mono text-muted">
                  taşıma {formatPrice(p.gross.amount)}
                  {Number(p.commission.amount) > 0 && ` · komisyon ${formatPrice(p.commission.amount)}`}
                </span>
                <span className="stat ml-auto text-base">{formatPrice(p.net.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/*
        Ödeme altyapısının bağlı olmadığı saklanmıyor. Hakedişi "ödendi"
        göstermek, olmayan bir para hareketini olmuş gibi sunmak olurdu.
      */}
      <p className="mt-8 text-sm text-muted">
        Hakediş tutarları kesinleşmiş taşıma bedelinden komisyon düşülerek
        hesaplanıyor. Ödeme altyapısı bağlandığında aktarım bu sayfadan
        izlenebilecek.
      </p>
    </Shell>
  );
}
