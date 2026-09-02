import type { CargoCategory, VehicleType } from '@turmove/contracts';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/**
 * Katalog uçları kimlik gerektirmiyor — kullanıcı fiyat almadan ve kayıt olmadan
 * önce buradan geçiyor. API kapalıysa sayfa boş liste ile render edilir; iskelet
 * aşamasında backend olmadan da web ayağa kalkabilmeli.
 */
async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public${path}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getVehicleTypes = () => get<VehicleType[]>('/vehicle-types');
export const getCargoCategories = () => get<CargoCategory[]>('/cargo-categories');
