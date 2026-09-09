import { auth, isDriver } from '@/auth';
import { Hero } from '@/components/hero/Hero';
import { ActiveCorridors } from '@/components/site/ActiveCorridors';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { HowItWorks } from '@/components/site/HowItWorks';
import { QuoteWidget } from '@/components/site/QuoteWidget';
import { SceneTransition } from '@/components/site/SceneTransition';
import { SearchSection } from '@/components/site/SearchSection';
import { Faq } from '@/components/site/Faq';
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
        <SceneTransition />
        {/* Sıra kasıtlı: eylem → kanıt → mekanizma.
            (1) Hero'daki fiyat widget'ı yalnızca geniş ekranda görünüyor; telefonda
            tek kullanılabilir widget bu bölüm ve ölçtüğümüzde sayfanın 3.900 piksel
            aşağısındaydı — fiyat almak isteyen kullanıcı dört ekran kaydırıyordu.
            (2) Ardından "burada gerçekten iş var mı?" sorusu: iki taraflı bir
            pazarda ziyaretçinin ilk şüphesi bu ve kartlar ilanların kendisine
            götürüyor.
            (3) Üç adım en sona kalıyor: hero anlatısı işleyişi zaten gösterdi,
            tekrar okumak isteyen aşağıda buluyor. */}
        <SearchSection vehicles={vehicles ?? []} />
        <ActiveCorridors />
        <HowItWorks />
        <TwoSidedMarket shipperHref={shipperHref} carrierHref={carrierJoinHref} />
        <VehicleRange vehicles={vehicles ?? []} />
        <TrustSection />
        {/* En sonda: ürünü anlatan bölümleri okuduktan sonra kalan sorular */}
        <Faq />
      </main>
      <Footer />
    </>
  );
}
