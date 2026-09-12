import type { FinanceSummary } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import { ApiError, apiFetch } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Finans' };
export const dynamic = 'force-dynamic';

/**
 * Finans panosu.
 *
 * <p><strong>Ciro ile gelir ayrı.</strong> GMV platform üzerinden geçen toplam
 * işlem hacmi; platform geliri ise komisyon. İkisini tek bir "gelir" rakamında
 * birleştirmek şirketin ekonomik büyüklüğünü yanlış anlatır ve mali müşavirin
 * göreceği tabloyu bozar.
 *
 * <p>Rakamlar gerçek kayıtlardan; demo veri yok. Hiç işlem yoksa sıfır yazıyor,
 * uydurma bir hacim gösterilmiyor.
 *
 * <p>Yetki uçta: {@code /api/v1/admin/finance/**} yalnızca FINANCE_ADMIN ve ADMIN
 * rollerine açık. Operasyon görevlisi bu sayfayı açsa da 403 alır.
 */
export default async function FinancePage() {
  let ozet: FinanceSummary | null = null;
  let hata: string | null = null;
  try {
    ozet = await apiFetch<FinanceSummary>('/admin/finance/summary');
  } catch (e) {
    hata = e instanceof ApiError && e.status === 403
      ? 'Bu sayfa finans yetkisi gerektiriyor.'
      : 'Finans özeti alınamadı.';
  }

  if (hata) {
    return (
      <div className="rounded-card border border-line bg-surface p-6">
        <p className="font-semibold">{hata}</p>
      </div>
    );
  }
  if (!ozet) return null;

  /*
   * Sıralama bilinçli: önce hacim, sonra gelir, sonra yükümlülükler. Gelirin
   * hemen cironun yanında durması, ikisinin farkını okunur kılıyor.
   */
  const kartlar: { etiket: string; deger: string; aciklama: string; vurgu?: boolean }[] = [
    {
      etiket: 'GMV — işlem hacmi',
      deger: formatPrice(ozet.gmv.amount),
      aciklama: 'Platform üzerinden geçen toplam taşıma bedeli. Bu tutar şirketin geliri değildir.',
    },
    {
      etiket: 'Platform geliri',
      deger: formatPrice(ozet.platformRevenue.amount),
      aciklama: 'Karınca’nın aracılık komisyonu — şirketin gerçek geliri.',
      vurgu: true,
    },
    {
      etiket: 'Taşıyıcıya borç',
      deger: formatPrice(ozet.carrierPayable.amount),
      aciklama: 'Hakediş olarak taşıyıcılara ödenecek tutar.',
    },
    {
      etiket: 'Komisyon vergisi',
      deger: formatPrice(ozet.commissionTax.amount),
      aciklama: 'Komisyon üzerinden hesaplanan vergi. Taşıma bedelinin vergisi değildir.',
    },
    {
      etiket: 'İadeler',
      deger: formatPrice(ozet.refunds.amount),
      aciklama: 'İade edilen tutar. Brüt hacim geriye dönük silinmez.',
    },
    {
      etiket: 'Ödeme sağlayıcı maliyeti',
      deger: formatPrice(ozet.paymentFees.amount),
      aciklama: 'Sağlayıcı bağlanmadığı için şu an sıfır.',
    },
  ];

  return (
    <>
      <h1 className="text-xl font-bold">Finans</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Gerçek kayıtlardan hesaplanıyor. Ödeme, hakediş ve fatura sağlayıcıları henüz
        bağlı değil; bu yüzden para hareketi oluşmuyor, yalnızca yükümlülükler
        izleniyor.
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kartlar.map((k) => (
          <div
            key={k.etiket}
            className={`rounded-card border p-5 ${
              k.vurgu ? 'border-[var(--route-deep)] bg-[var(--route-soft)]' : 'border-line bg-surface'
            }`}
          >
            <dt className="label-mono text-muted">{k.etiket}</dt>
            <dd className="stat mt-2 text-[1.6rem] leading-none">{k.deger}</dd>
            <p className="mt-2 text-sm leading-relaxed text-muted">{k.aciklama}</p>
          </div>
        ))}
      </dl>

      <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-5">
        <div>
          <dd className="stat text-lg leading-none">{ozet.shipmentCount}</dd>
          <dt className="label-mono mt-1 text-muted">Finansal kaydı olan taşıma</dt>
        </div>
        <div>
          <dd className="stat text-lg leading-none">{ozet.pendingPayouts}</dd>
          <dt className="label-mono mt-1 text-muted">Bekleyen hakediş</dt>
        </div>
        <div>
          <dd className="stat text-lg leading-none">{ozet.eligiblePayouts}</dd>
          <dt className="label-mono mt-1 text-muted">Ödenebilir hakediş</dt>
        </div>
      </dl>

      {/*
        Tutarsızlık sessizce geçilmiyor. Sıfırdan büyükse bu bir hesap hatasıdır
        ve para yanlış dağıtılıyor olabilir.
      */}
      {ozet.unbalanced > 0 ? (
        <p className="mt-6 rounded-card border border-[var(--warning)] bg-[#fff4e8] p-4 text-sm">
          <strong>{ozet.unbalanced} taşımanın mutabakatı bozuk.</strong> Defter borç ve
          alacağı tutmuyor ya da komisyon + hakediş brütü vermiyor. Ödeme yapılmadan
          önce incelenmeli.
        </p>
      ) : (
        <p className="label-mono mt-6 text-muted">Mutabakat: bütün taşımalar dengeli</p>
      )}
    </>
  );
}
