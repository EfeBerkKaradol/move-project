import type {
  CargoCategory,
  CargoDeclarationRequest,
  CargoItem,
  CargoPreset,
  District,
  ExtraService,
  Quote,
  QuoteRequest,
  VehicleRecommendation,
  VehicleType,
} from '@tasiyoruz/contracts';
import { FALLBACK_FLEET } from './fallback-fleet';

const DEFAULT_API_URL = 'http://localhost:8080';

/**
 * API adresini çözer.
 *
 * <p>`??` yeterli değil: ortam değişkeni <em>boş string</em> olarak tanımlıysa
 * (Vercel'de değeri silinmiş bir değişken böyle gelir) `??` varsayılana düşmez.
 * O durumda istek adresi "/api/v1/public/..." gibi göreli kalıyor ve sunucu
 * tarafındaki fetch bunu ayrıştıramıyordu.
 *
 * <p>Sunucudan yapılan istekler mutlak adres gerektirir; göreli bir değer
 * verilmişse de varsayılana dönülüyor ve log'a yazılıyor.
 */
function resolveApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return DEFAULT_API_URL;

  if (!/^https?:\/\//i.test(raw)) {
    console.warn(
      `[api] NEXT_PUBLIC_API_URL mutlak bir adres olmalı (http:// veya https://), ` +
        `alınan: ${JSON.stringify(raw)} — varsayılana dönülüyor`,
    );
    return DEFAULT_API_URL;
  }

  return raw.replace(/\/+$/, '');
}

export const API_URL = resolveApiUrl();

/**
 * Sunucu tarafı isteklerin üst sınırı.
 *
 * <p>Zaman aşımı olmadan, ulaşılamayan bir API'ye açılan bağlantı asılı kalıyor ve
 * derlemeyi kilitliyordu: Vercel'de sayfa üretimi 60 saniyelik bütçeyi doldurup
 * build'i düşürdü. Hızlı başarısız olmak, yavaş başarısız olmaktan iyidir.
 */
const SERVER_FETCH_TIMEOUT_MS = 6000;

/**
 * Katalog uçları kimlik gerektirmiyor — kullanıcı fiyat almadan ve kayıt olmadan
 * önce buradan geçiyor. API ulaşılamazsa null dönüyor; çağıran taraf ya yedek
 * veriyle ya da bilgilendirici bir durumla devam ediyor.
 */
async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public${path}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[api] ${path} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    // Sessizce yutmuyoruz: dağıtım loglarında API'nin ulaşılamadığı görünmeli
    console.warn(`[api] ${path} ulaşılamadı:`, (error as Error).message);
    return null;
  }
}

/**
 * Araç filosu. API ulaşılamazsa yedek listeye düşüyor — pazarlama sayfası
 * backend olmadan da tasarlandığı gibi görünmeli (bkz. fallback-fleet.ts).
 */
export async function getVehicleTypes(): Promise<VehicleType[]> {
  const fromApi = await get<VehicleType[]>('/vehicle-types');
  if (fromApi && fromApi.length > 0) return fromApi;
  console.warn('[api] araç filosu yedek listeden okundu');
  return FALLBACK_FLEET;
}
export const getCargoCategories = () => get<CargoCategory[]>('/cargo-categories');
export const getCargoItems = () => get<CargoItem[]>('/cargo-items');
export const getCargoPresets = () => get<CargoPreset[]>('/cargo-presets');
export const getDistricts = () => get<District[]>('/districts');
export const getExtraServices = () => get<ExtraService[]>('/extra-services');

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

/** Fiyat teklifi — kimlik gerektirmez, her seçim değişikliğinde yenilenir. */
export async function fetchQuote(body: QuoteRequest, signal?: AbortSignal): Promise<Quote> {
  const res = await fetch(`${API_URL}/api/v1/public/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(problem?.detail ?? `Fiyat hesaplanamadı (${res.status})`);
  }
  return (await res.json()) as Quote;
}
