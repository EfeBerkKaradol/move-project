import type { CargoCategory, CargoItem, District, ExtraService, VehicleType } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isCustomer } from '@/auth';
import { Shell } from '@/components/app/Shell';
import { getCargoCategories, getCargoItems, getDistricts, getExtraServices, getVehicleTypes } from '@/lib/api';
import { categoriesFor, decodeItems } from '@/lib/cargo';
import { matchDistrict } from '@/lib/places';
import { PublishForm } from './PublishForm';

export const metadata: Metadata = { title: 'İlanı yayınla' };
export const dynamic = 'force-dynamic';

function itemsFor(vehicleCode: string, items: CargoItem[]): CargoItem[] {
  const allowed = categoriesFor(vehicleCode);
  return items.filter((i) => allowed.includes(i.categoryCode));
}

type Params = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * Fiyat sayfasındaki seçim URL ile buraya taşınır; giriş gerekiyorsa middleware
 * /giris'e yollar ve kullanıcı aynı adrese geri döner — seçimi kaybolmaz.
 */
export default async function NewListingPage({ searchParams }: { searchParams: Params }) {
  const [session, p, districts, vehicles, extras, items, categories] = await Promise.all([
    auth(), searchParams, getDistricts(), getVehicleTypes(), getExtraServices(),
    getCargoItems(), getCargoCategories(),
  ]);
  /*
   * Girişe yollarken seçim de gidiyor. Normalde buraya hiç gelinmiyor —
   * middleware oturumsuz isteği zaten callbackUrl ile /giris'e çeviriyor — ama
   * bu satır onun sessiz ikizi: callbackUrl'süz bir redirect, kullanıcının fiyat
   * adımında doldurduğu her şeyi (rota, araç, kat, beyan, alış saati) girişten
   * sonra silerdi. Aynı bilgiyi iki kez sormamak bu iki yerin birden doğru
   * olmasına bağlı.
   */
  if (!canCallApi(session)) {
    const q = new URLSearchParams(
      Object.entries(p).flatMap(([k, v]) =>
        typeof v === 'string' ? [[k, v] as [string, string]] : [],
      ),
    ).toString();
    redirect(`/giris?callbackUrl=${encodeURIComponent(`/panel/ilan/yeni${q ? `?${q}` : ''}`)}`);
  }
  if (!isCustomer(session.roles)) redirect(homeFor(session.roles));

  const pickup = districts ? matchDistrict(districts, first(p.nereden)) : null;
  const dropoff = districts ? matchDistrict(districts, first(p.nereye)) : null;
  const vehicle = vehicles.find((v) => v.code === first(p.arac) && v.active) ?? null;

  if (!pickup || !dropoff || !vehicle) {
    return (
      <Shell eyebrow="Yük veren" title="Önce rotanı ve aracını seç">
        <p className="text-muted">İlan yayınlamak için fiyat sayfasından nereden, nereye ve araç tipini seçmen gerekiyor.</p>
        <Link href="/fiyat-hesapla" className="mt-6 inline-block rounded-field bg-route px-5 py-3 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px">
          Fiyat hesapla
        </Link>
      </Shell>
    );
  }

  // Bu araçla taşınabilecek kalemler; fiyat adımından gelen beyan da bununla
  // süzülüyor: araç değiştirilmişse eski kategorinin kalemleri düşüyor
  const secilebilir = itemsFor(vehicle.code, (items ?? []) as CargoItem[]);

  return (
    <Shell eyebrow="Yük veren" title="İlanı yayınla">
      <PublishForm
        pickup={pickup as District}
        dropoff={dropoff as District}
        vehicle={vehicle as VehicleType}
        extras={(extras ?? []) as ExtraService[]}
        cargoItems={secilebilir}
        cargoCategories={(categories ?? []) as CargoCategory[]}
        initial={{
          serviceModel: first(p.model) === 'SCHEDULED' ? 'SCHEDULED' : 'INSTANT',
          pickupFloor: Number(first(p.pf) || 0),
          pickupHasElevator: first(p.pe) !== '0',
          dropoffFloor: Number(first(p.df) || 0),
          dropoffHasElevator: first(p.de) !== '0',
          extraServices: first(p.ek).split(',').filter(Boolean),
          // Fiyat adımında seçildiyse buraya taşınıyor; kullanıcı aynı soruyu
          // iki kez cevaplamıyor ama burada değiştirebiliyor
          pickupWindow: first(p.bas) && first(p.bit)
            ? { start: first(p.bas), end: first(p.bit) }
            : null,
          // Yük fiyat adımında tarif edildi; aynı soru burada tekrar sorulmuyor
          cargoItems: decodeItems(first(p.yuk), new Set(secilebilir.map((i) => i.code))),
          pickupNeighborhood: first(p.sa).slice(0, 96),
          dropoffNeighborhood: first(p.st).slice(0, 96),
        }}
      />
    </Shell>
  );
}
