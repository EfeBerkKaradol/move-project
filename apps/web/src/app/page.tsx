import { BackhaulSection } from '@/components/site/BackhaulSection';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { HeroStats } from '@/components/site/HeroStats';
import { QuoteWidget } from '@/components/site/QuoteWidget';
import { TrustChips } from '@/components/site/TrustChips';
import { TwoSidedMarket } from '@/components/site/TwoSidedMarket';
import { VehicleRange } from '@/components/site/VehicleRange';
import { getVehicleTypes } from '@/lib/api';

export default async function HomePage() {
  const vehicles = (await getVehicleTypes()) ?? [];

  return (
    <>
      <Header />
      <main>
        {/* Masaüstünde metin solda, teklif widget'ı sağda; mobilde alt alta (tasarım, masaüstü çerçevesi) */}
        <section className="theme-dark bg-bg pb-16 pt-14 lg:pb-24 lg:pt-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="label-mono text-amber">81 il · Motosikletten kırkayağa</p>

              <h1 className="mt-5 text-[clamp(2.1rem,5.2vw,4.25rem)] leading-[1.02]">
                Yükünüz için doğru aracı dakikalar içinde bulun.
              </h1>

              <p className="mt-6 max-w-lg text-lg text-muted">
                Rotanızı girin, doğrulanmış araç sahiplerinden teklif alın. Aracı siz seçin,
                ödemeyi teslimatta onaylayın.
              </p>

              <TrustChips />
              <HeroStats />
            </div>

            {vehicles.length > 0 && <QuoteWidget vehicles={vehicles} />}
          </div>
        </section>

        <VehicleRange vehicles={vehicles} />
        <TwoSidedMarket />
        <BackhaulSection />
      </main>
      <Footer />
    </>
  );
}
