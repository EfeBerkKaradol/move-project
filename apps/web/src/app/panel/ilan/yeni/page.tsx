import type { District, ExtraService, VehicleType } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, isCustomer } from '@/auth';
import { Shell } from '@/components/app/Shell';
import { getDistricts, getExtraServices, getVehicleTypes } from '@/lib/api';
import { matchDistrict } from '@/lib/places';
import { PublishForm } from './PublishForm';

export const metadata: Metadata = { title: 'İlanı yayınla' };
export const dynamic = 'force-dynamic';

type Params = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * Fiyat sayfasındaki seçim URL ile buraya taşınır; giriş gerekiyorsa middleware
 * /giris'e yollar ve kullanıcı aynı adrese geri döner — seçimi kaybolmaz.
 */
export default async function NewListingPage({ searchParams }: { searchParams: Params }) {
  const [session, p, districts, vehicles, extras] = await Promise.all([
    auth(), searchParams, getDistricts(), getVehicleTypes(), getExtraServices(),
  ]);
  if (!session || !isCustomer(session.roles)) redirect('/nakliyeci');

  const pickup = districts ? matchDistrict(districts, first(p.nereden)) : null;
  const dropoff = districts ? matchDistrict(districts, first(p.nereye)) : null;
  const vehicle = vehicles.find((v) => v.code === first(p.arac) && v.active) ?? null;

  if (!pickup || !dropoff || !vehicle) {
    return (
      <Shell eyebrow="Yük veren" title="Önce rotanı ve aracını seç">
        <p className="text-muted">İlan yayınlamak için fiyat sayfasından nereden, nereye ve araç tipini seçmen gerekiyor.</p>
        <Link href="/fiyat-hesapla" className="mt-6 inline-block rounded-field bg-amber px-5 py-3 text-sm font-bold text-[var(--amber-ink)]">
          Fiyat hesapla
        </Link>
      </Shell>
    );
  }

  return (
    <Shell eyebrow="Yük veren" title="İlanı yayınla">
      <PublishForm
        pickup={pickup as District}
        dropoff={dropoff as District}
        vehicle={vehicle as VehicleType}
        extras={(extras ?? []) as ExtraService[]}
        initial={{
          serviceModel: first(p.model) === 'SCHEDULED' ? 'SCHEDULED' : 'INSTANT',
          pickupFloor: Number(first(p.pf) || 0),
          pickupHasElevator: first(p.pe) !== '0',
          dropoffFloor: Number(first(p.df) || 0),
          dropoffHasElevator: first(p.de) !== '0',
          extraServices: first(p.ek).split(',').filter(Boolean),
        }}
      />
    </Shell>
  );
}
