import { auth, isDriver } from '@/auth';
import { Hero } from '@/components/hero/Hero';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { HowItWorks } from '@/components/site/HowItWorks';
import { QuoteWidget } from '@/components/site/QuoteWidget';
import { SearchSection } from '@/components/site/SearchSection';
import { TrustSection } from '@/components/site/TrustSection';
import { TwoSidedMarket } from '@/components/site/TwoSidedMarket';
import { VehicleRange } from '@/components/site/VehicleRange';
import { getVehicleTypes } from '@/lib/api';

export default async function HomePage() {
  const [vehicles, session] = await Promise.all([getVehicleTypes(), auth()]);

  // Araç sahibi tarafının hedefi kullanıcıya göre: onaylı sürücü panele,
  // diğer herkes önce taşıyıcı olma akışına gider.
  const carrierHref =
    session && session.error !== 'RefreshFailed' && isDriver(session.roles ?? [])
      ? '/nakliyeci'
      : '/sofor-ol';
  const shipperHref = '/fiyat-hesapla';

  return (
    <>
      <Header overlay />
      <main>
        <Hero
          shipperHref={shipperHref}
          carrierHref={carrierHref}
          widget={vehicles?.length ? <QuoteWidget vehicles={vehicles} /> : null}
        />
        <HowItWorks />
        <SearchSection vehicles={vehicles ?? []} />
        <TwoSidedMarket shipperHref={shipperHref} carrierHref={carrierHref} />
        <VehicleRange vehicles={vehicles ?? []} />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
