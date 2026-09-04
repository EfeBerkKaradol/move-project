import type { Metadata } from 'next';
import { BookingFlow } from '@/components/booking/BookingFlow';
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

export const metadata: Metadata = {
  title: 'Fiyat hesapla',
  description:
    'Ne taşıyacağınızı söyleyin, uygun aracı gerekçesiyle önerelim. Kayıt gerekmez.',
};

export default async function QuotePage() {
  const [categories, items, presets, vehicleTypes, districts, extraServices] = await Promise.all([
    getCargoCategories(),
    getCargoItems(),
    getCargoPresets(),
    getVehicleTypes(),
    getDistricts(),
    getExtraServices(),
  ]);

  if (!categories || !items || !presets || !vehicleTypes || !districts || !extraServices) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-24">
          <h1 className="font-display text-2xl font-bold">Katalog yüklenemedi</h1>
          <p className="mt-3 text-ink-muted">
            API çalışmıyor olabilir. <code className="text-ink">pnpm infra:up</code> ve{' '}
            <code className="text-ink">pnpm api</code> ile ayağa kaldırabilirsin.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          Ne taşıyacağını söyle, aracı biz bulalım
        </h1>
        <p className="mt-3 max-w-xl text-ink-muted">
          Kayıt gerekmez. Yükünüzü tarif edin; uygun aracı, net fiyatı ve neden o araç
          olduğunu görün.
        </p>

        <div className="mt-10">
          <BookingFlow
            categories={categories}
            items={items}
            presets={presets}
            vehicleTypes={vehicleTypes}
            districts={districts}
            extraServices={extraServices}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
