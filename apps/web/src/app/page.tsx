import { Suspense } from 'react';
import type { District, VehicleType } from '@tasiyoruz/contracts';
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
import { getDistricts, getVehicleTypes } from '@/lib/api';

/**
 * Araç kataloğunu bekleyen bölümler.
 *
 * <p>Üçü de <em>aynı</em> promise'i bekliyor: katalog bir kez isteniyor, üç kez
 * değil. Her biri kendi Suspense sınırının içinde beklediği için katalog gecikse
 * bile sayfanın geri kalanı HTML'e yazılmış oluyor.
 */
type Fleet = Promise<VehicleType[]>;
/** Hizmet katalogu; yer seçicisi olmadan İstanbul ve Ankara dışını gösteremiyor. */
type Katalog = Promise<District[] | null>;

async function HeroQuote({ fleet, katalog }: { fleet: Fleet; katalog: Katalog }) {
  const [vehicles, districts] = await Promise.all([fleet, katalog]);
  return vehicles.length > 0 ? (
    <QuoteWidget vehicles={vehicles} districts={districts} tone="scene" />
  ) : null;
}

async function SearchSlot({ fleet, katalog }: { fleet: Fleet; katalog: Katalog }) {
  const [vehicles, districts] = await Promise.all([fleet, katalog]);
  return <SearchSection vehicles={vehicles} districts={districts} />;
}

async function VehicleSlot({ fleet }: { fleet: Fleet }) {
  return <VehicleRange vehicles={await fleet} />;
}

export default async function HomePage() {
  /*
   * Katalog isteniyor ama BURADA beklenmiyor.
   *
   * <p>Beklendiğinde sayfanın tamamı — başlıktaki gezinme düğmeleri ve hero'daki
   * iki eylem dahil — API cevap verene kadar HTML'e hiç yazılmıyordu. Render'ın
   * ücretsiz örneği 15 dakika istek almayınca uyuyor ve uyanması ~60 saniye
   * sürüyor; istemcideki 6 saniyelik zaman aşımı iki ardışık dalgada dolunca
   * ziyaretçi 12 saniye boyunca tıklayınca hiçbir şey olmayan bir sayfaya
   * bakıyordu. Düğmeler kırık değildi: HTML'i henüz gelmemişti.
   *
   * <p>Promise burada başlıyor, aşağıdaki Suspense sınırlarında bekleniyor;
   * kabuk ilk pakette akıyor ve hemen tıklanabilir oluyor.
   */
  const fleet = getVehicleTypes();
  const katalog = getDistricts();
  const session = await auth();

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
          widget={
            <Suspense fallback={null}>
              <HeroQuote fleet={fleet} katalog={katalog} />
            </Suspense>
          }
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
        <Suspense fallback={null}>
          <SearchSlot fleet={fleet} katalog={katalog} />
        </Suspense>
        {/* Koridorlar kendi sınırında: ayrı bir uç, ayrı gecikme. Eskiden katalog
            beklendikten SONRA başlıyordu ve iki zaman aşımı üst üste biniyordu. */}
        <Suspense fallback={null}>
          <ActiveCorridors />
        </Suspense>
        <HowItWorks />
        <TwoSidedMarket shipperHref={shipperHref} carrierHref={carrierJoinHref} />
        {/* Çapa (/#araclar) bölüm akmadan önce de hedef bulmalı */}
        <Suspense fallback={<section id="araclar" aria-hidden className="min-h-[40vh]" />}>
          <VehicleSlot fleet={fleet} />
        </Suspense>
        <TrustSection />
        {/* En sonda: ürünü anlatan bölümleri okuduktan sonra kalan sorular */}
        <Faq />
      </main>
      <Footer />
    </>
  );
}
