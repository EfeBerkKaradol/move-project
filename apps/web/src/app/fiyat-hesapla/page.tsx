import type { Metadata } from 'next';
import Link from 'next/link';
import { EstimateFlow } from '@/components/estimate/EstimateFlow';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import {
  getCargoCategories,
  getCargoItems,
  getCargoPresets,
  getDistricts,
  getExtraServices,
  getVehicleTypes,
} from '@/lib/api';

/**
 * Bu sayfa etkileşimli bir araç, pazarlama sayfası değil: katalog, ilçe listesi ve
 * tarife API'den geliyor ve kullanıcının seçimine göre değişiyor.
 *
 * <p>Derleme sırasında statik üretilmesi iki soruna yol açıyordu: API'nin
 * bulunmadığı ortamlarda build 60 saniyelik sayfa üretim bütçesini doldurup
 * düşüyordu, ve üretilse bile "katalog yüklenemedi" hâli bir saat boyunca
 * önbellekten servis ediliyordu. İstek anında render ediliyor.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fiyat hesapla',
  description:
    'Rotanı ve aracını seç, tarife tabanlı tahmini aralığı gör. Kayıt gerekmez; kesin fiyatı araç sahipleri teklifle verir.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function EstimatePage({ searchParams }: { searchParams: SearchParams }) {
  const [params, vehicleTypes, districts, extraServices, categories, items, presets] =
    await Promise.all([
      searchParams,
      getVehicleTypes(),
      getDistricts(),
      getExtraServices(),
      getCargoCategories(),
      getCargoItems(),
      getCargoPresets(),
    ]);

  // Danışman (kategori → öneri) kataloğun tamamını ister; eksikse bölüm gizlenir
  const catalog =
    categories?.length && items && presets ? { categories, items, presets } : null;

  const vehicleCode = vehicleTypes?.some((v) => v.code === first(params.arac) && v.active)
    ? first(params.arac)
    : null;

  return (
    <>
      <Header />
      <main className="theme-cream min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <p className="label-mono text-[#8a5c10]">Kayıt gerekmez · Tahmini aralık · Komisyon dahil</p>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,3rem)] leading-[1.06]">
            Rotanı ve aracını seç, tahmini fiyatı gör.
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Aralık sözleşmeli tarifeden hesaplanır. Sonra ilanını yayınlarsın; doğrulanmış araç
            sahipleri kesin teklif verir, sen seçersin.
          </p>

          <div className="mt-10">
            {vehicleTypes && districts ? (
              <EstimateFlow
                vehicleTypes={vehicleTypes}
                districts={districts}
                extraServices={extraServices ?? []}
                catalog={catalog}
                initial={{ from: first(params.nereden), to: first(params.nereye), vehicleCode }}
              />
            ) : (
              /*
               * Ziyaretçiye teknik ayrıntı ya da geliştirme komutu gösterilmiyor:
               * bu ekran canlıda gerçek kullanıcıların önüne çıkıyor. Geliştirme
               * ipucu yalnızca yerel ortamda görünür.
               */
              <div className="rounded-card border border-line bg-surface p-6">
                <p className="font-semibold">Fiyat hesaplama şu an kullanılamıyor.</p>
                <p className="mt-2 max-w-md text-sm text-muted">
                  Kısa süreli bir aksaklık olabilir; birazdan tekrar deneyin. Acil taşımanız
                  varsa yükünüzü ilan olarak yayınlayabilirsiniz, araç sahipleri size teklif
                  versin.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/yuk-ver"
                    className="rounded-field bg-amber px-5 py-3 text-sm font-bold text-[var(--amber-ink)]"
                  >
                    Yük ilanı ver
                  </Link>
                  <Link
                    href="/"
                    className="rounded-field border border-line px-5 py-3 text-sm font-semibold"
                  >
                    Ana sayfaya dön
                  </Link>
                </div>
                {process.env.NODE_ENV !== 'production' && (
                  <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
                    Geliştirme notu: API ulaşılamıyor. <code>pnpm infra:up</code> ve{' '}
                    <code>pnpm api</code> ile ayağa kaldırabilirsin.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
