import { CitiesAndCta } from '@/components/site/CitiesAndCta';
import { FleetShowcase } from '@/components/site/FleetShowcase';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { Hero } from '@/components/site/Hero';
import { HowItWorks } from '@/components/site/HowItWorks';
import { TrustBoardPreview } from '@/components/site/TrustBoardPreview';
import { getDistricts, getVehicleTypes } from '@/lib/api';

export default async function HomePage() {
  const [vehicleTypes, districts] = await Promise.all([getVehicleTypes(), getDistricts()]);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        {vehicleTypes && vehicleTypes.length > 0 && <FleetShowcase vehicles={vehicleTypes} />}
        <TrustBoardPreview />
        <CitiesAndCta districtCount={districts?.length ?? 0} />
      </main>
      <Footer />
    </>
  );
}
