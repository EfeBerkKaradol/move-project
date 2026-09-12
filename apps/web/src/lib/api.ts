import type {
  CargoCategory,
  LegalDocumentView,
  PublicCorridorView,
  PublicFleetCountView,
  PublicListingView,
  CargoDeclarationRequest,
  CargoItem,
  CargoPreset,
  District,
  ExtraService,
  PublicStatsView,
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
 *
 * <p>6 saniyeydi, 3'e indi. Ölçüm: API ayaktayken uçlar 0,12–0,33 sn sürüyor,
 * yani 3 saniye sağlıklı bir isteğin on katı. Uyuyan örnek ise 35–60 saniyede
 * uyanıyor — orada 6 saniye de yetmiyor, yalnızca kullanıcıyı iki kat uzun
 * bekletiyordu. Kısaltmak sağlıklı isteği düşürmüyor, uyanma aralığındaki
 * beklemeyi yarıya indiriyor.
 */
const SERVER_FETCH_TIMEOUT_MS = 3000;

/**
 * Katalog uçları kimlik gerektirmiyor — kullanıcı fiyat almadan ve kayıt olmadan
 * önce buradan geçiyor. API ulaşılamazsa null dönüyor; çağıran taraf ya yedek
 * veriyle ya da bilgilendirici bir durumla devam ediyor.
 */
/**
 * @param revalidateSeconds Katalog verisi saatlerce değişmiyor; canlı sayaç ve
 *   koridorlar değişiyor. Varsayılan bir saat, canlı uçlar kendi süresini verir —
 *   yoksa "şu an yolda" bölümü bir saat önceki tabloyu gösterirdi.
 */
/**
 * Son başarılı katalog cevabı.
 *
 * <p>API ücretsiz katmanda 15 dakika istek almayınca uyuyor ve uyanması bir
 * dakikayı bulabiliyor; o aralıkta katalog isteği zaman aşımına uğrayıp
 * <em>hiçbir şey</em> döndürüyordu. Fiyat sayfasının ilçe listesi boşalıyor,
 * araç seçici yedek listeye düşüyordu — oysa elimizde dakikalar önce alınmış,
 * hâlâ geçerli bir cevap vardı.
 *
 * <p>Yalnızca REFERANS verisi için. Canlı veri (ilanlar, sayaçlar, koridorlar)
 * bu yoldan geçmiyor: saatler önceki bir ilan panosunu taze gibi göstermek,
 * boş göstermekten daha yanıltıcı.
 *
 * <p>Süreç belleğinde duruyor; sunucu örneği değişince kayboluyor ve o zaman
 * davranış eskisine dönüyor. Kalıcı olması gerekmiyor: amacı uyanma aralığını
 * köprülemek.
 */
const sonIyiKatalog = new Map<string, unknown>();

/**
 * @param referans Cevap katalog verisi mi? Katalog nadiren değişiyor, bu yüzden
 *   istek başarısız olduğunda son başarılı cevap dönüyor.
 */
async function get<T>(path: string, revalidateSeconds = 3600, referans = false): Promise<T | null> {
  const bayat = () => (referans ? ((sonIyiKatalog.get(path) as T | undefined) ?? null) : null);
  try {
    const res = await fetch(`${API_URL}/api/v1/public${path}`, {
      next: { revalidate: revalidateSeconds },
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[api] ${path} → HTTP ${res.status}`);
      return bayat();
    }
    const data = (await res.json()) as T;
    if (referans) sonIyiKatalog.set(path, data);
    return data;
  } catch (error) {
    // Sessizce yutmuyoruz: dağıtım loglarında API'nin ulaşılamadığı görünmeli
    console.warn(`[api] ${path} ulaşılamadı:`, (error as Error).message);
    return bayat();
  }
}

/**
 * Araç filosu. API ulaşılamazsa yedek listeye düşüyor — pazarlama sayfası
 * backend olmadan da tasarlandığı gibi görünmeli (bkz. fallback-fleet.ts).
 */
export async function getVehicleTypes(): Promise<VehicleType[]> {
  const fromApi = await get<VehicleType[]>('/vehicle-types', 3600, true);
  if (fromApi && fromApi.length > 0) return fromApi;
  console.warn('[api] araç filosu yedek listeden okundu');
  return FALLBACK_FLEET;
}
export const getCargoCategories = () => get<CargoCategory[]>('/cargo-categories', 3600, true);
export const getCargoItems = () => get<CargoItem[]>('/cargo-items', 3600, true);
export const getCargoPresets = () => get<CargoPreset[]>('/cargo-presets', 3600, true);
export const getDistricts = () => get<District[]>('/districts', 3600, true);
/** Ana sayfa sayaçları; API kapalıysa null döner ve arayüz tire gösterir. */
/**
 * Yürürlükteki hukuki belgeler. Bir saat önbellekli: sürüm ancak yeni bir
 * migration ile değişiyor, dakikalık tazelik gerektirmiyor.
 */
export const getLegalDocuments = () => get<LegalDocumentView[]>('/legal-documents').then((d) => d ?? []);

export const getCorridors = () => get<PublicCorridorView[]>('/corridors', 60);

/**
 * Açık ilanlar. Sayaçlarla aynı tazelik: bir dakikalık gecikme ilan panosunda
 * fark edilmiyor, her ziyaretin çekirdek tabloya sorgu atması fark ediyor.
 */
export const getPublicListings = (params: { vehicleType?: string; city?: string } = {}) => {
  const query = new URLSearchParams();
  if (params.vehicleType) query.set('vehicleType', params.vehicleType);
  if (params.city) query.set('city', params.city);
  const suffix = query.size > 0 ? `?${query}` : '';
  return get<PublicListingView[]>(`/listings${suffix}`, 60);
};
/**
 * Tek bir açık ilan.
 *
 * <p><strong>Neden ayrı bir uç yok:</strong> API'de `/listings/{id}` bulunmuyor ve
 * eklenseydi bu sayfa yalnızca API yeniden dağıtıldıktan sonra çalışırdı. Liste ucu
 * hem yayında hem önbellekli (60 sn) ve ilanın herkese açık hâlinde gereken bütün
 * alanları zaten taşıyor; aradaki fark sunucuda birkaç yüz kaydı gezmek.
 *
 * <p>Sınırı açık olsun: ilan, listenin döndüğü üst sınırın dışında kalırsa burada
 * bulunamaz ve sayfa 404 verir. İlan gerçekten kapandığında da aynı sonuç doğru
 * cevap. Pano binlerce ilana çıktığında kimliğe göre dönen bir uç gerekecek.
 */
export const getPublicListing = async (id: string): Promise<PublicListingView | null> => {
  const hepsi = await getPublicListings();
  return hepsi?.find((l) => l.id === id) ?? null;
};

/**
 * Araç tipi başına kayıtlı taşıyıcı sayısı. Katalogla kod üzerinden birleşiyor;
 * uç yalnızca sayıları taşıyor (bkz. PublicFleetCountView).
 */
export const getFleetCounts = () =>
  get<PublicFleetCountView[]>('/fleet-counts', 300, true).then((d) => d ?? []);

export const getPublicStats = () => get<PublicStatsView>('/stats', 60);
export const getExtraServices = () => get<ExtraService[]>('/extra-services', 3600, true);

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
    // Sunucu neden olmadığını söylüyorsa onu göster: "uygun araç yok" ile
    // "API kapalı" kullanıcı için aynı şey değil.
    const problem = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(problem?.detail ?? `Öneri alınamadı (${res.status})`);
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
