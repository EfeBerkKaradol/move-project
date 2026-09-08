import { auth, isDriver } from '@/auth';
import { Hero } from '@/components/hero/Hero';
import { ActiveCorridors } from '@/components/site/ActiveCorridors';
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

  const driver = !!session && session.error !== 'RefreshFailed' && isDriver(session.roles ?? []);

  // İki ayrı hedef. "Yük bul" işi göstermek demek: onaylı sürücü kendi paneline,
  // diğer herkes herkese açık ilan panosuna gider — ürünü hiç görmemiş birinden
  // önce belge yüklemesini istemek duvara toslatıyordu.
  const carrierBoardHref = driver ? '/nakliyeci' : '/ilanlar';
  // "Şoför olarak katıl" ise başvurunun kendisi; o hep başvuru akışına gider.
  const carrierJoinHref = driver ? '/nakliyeci' : '/sofor-ol';
  const shipperHref = '/fiyat-hesapla';

  return (
    <>
      <Header overlay />
      <main>
        <Hero
          shipperHref={shipperHref}
          carrierHref={carrierBoardHref}
          widget={vehicles?.length ? <QuoteWidget vehicles={vehicles} tone="scene" /> : null}
        />
        <HowItWorks />
        {/* Anlatının hemen ardından: ürünün çalıştığının kanıtı. Burada koridor ve
            sayı yeterli; kartlar ilanların kendisine (/ilanlar) götürüyor. */}
        <ActiveCorridors />
        <SearchSection vehicles={vehicles ?? []} />
        <TwoSidedMarket shipperHref={shipperHref} carrierHref={carrierJoinHref} />
        <VehicleRange vehicles={vehicles ?? []} />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
