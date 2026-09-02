import type {
  CargoCategory,
  CargoDeclarationRequest,
  CargoItem,
  CargoPreset,
  VehicleRecommendation,
  VehicleType,
} from '@turmove/contracts';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

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
export const getCargoItems = () => get<CargoItem[]>('/cargo-items');
export const getCargoPresets = () => get<CargoPreset[]>('/cargo-presets');

/** Araç önerisi — tarayıcıdan çağrılır, her seçim değişikliğinde yenilenir. */
export async function fetchRecommendation(
  body: CargoDeclarationRequest,
  signal?: AbortSignal,
): Promise<VehicleRecommendation> {
  const res = await fetch(`${API_URL}/api/v1/public/vehicle-recommendation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Öneri alınamadı (${res.status})`);
  }
  return (await res.json()) as VehicleRecommendation;
}
