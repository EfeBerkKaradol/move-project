/** Web ve mobil uygulamaların paylaştığı sabitler ve yardımcılar. */

export const CITIES = [
  { code: '34', name: 'İstanbul', slug: 'istanbul' },
  { code: '06', name: 'Ankara', slug: 'ankara' },
  { code: '31', name: 'Hatay', slug: 'hatay' },
] as const;

export type CityCode = (typeof CITIES)[number]['code'];

export const SERVICE_MODELS = ['INSTANT', 'SCHEDULED'] as const;
export type ServiceModel = (typeof SERVICE_MODELS)[number];

export const VEHICLE_TYPES = [
  'MOTOR',
  'MINI_PANELVAN',
  'PANELVAN',
  'MINIVAN',
  'KAMYONET',
  'KAMYON',
  'TIR',
] as const;
export type VehicleTypeCode = (typeof VEHICLE_TYPES)[number];

export const CARGO_CATEGORIES = [
  'BELGE_PAKET',
  'KOLI',
  'TEKIL_ESYA',
  'ODA',
  'EV',
  'TICARI',
  'INSAAT',
  'OZEL',
] as const;
export type CargoCategoryCode = (typeof CARGO_CATEGORIES)[number];

/** Komisyonsuz dönemin bitiş tarihi — pano ve fiyat dökümünde gösterilir. */
export const COMMISSION_FREE_UNTIL = new Date('2027-03-31T23:59:59+03:00');

export function isCommissionFree(now: Date = new Date()): boolean {
  return now <= COMMISSION_FREE_UNTIL;
}

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
});

export function formatPrice(amount: string | number): string {
  return TRY_FORMATTER.format(typeof amount === 'string' ? Number(amount) : amount);
}

export function formatVolume(m3: number): string {
  return `${m3.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m³`;
}

/**
 * Tarife fiyatından tahmini teklif aralığı üretir (docs/11 §2: platform aralık önerir,
 * kesin fiyatı araç sahibi teklifle verir).
 *
 * ⚠️ GEÇİCİ BAND — docs/11 açık soru #2. Geçmiş teklif verisi birikince band
 * gerçek teklif dağılımından türetilecek; o güne kadar tarifenin ±%10 civarı.
 */
export const ESTIMATE_BAND = { low: 0.92, high: 1.12 } as const;

export function estimateRange(tariffTotal: string | number): { low: number; high: number } {
  const t = typeof tariffTotal === 'string' ? Number(tariffTotal) : tariffTotal;
  // 10 TL'ye yuvarla — kuruşlu bir "tahmin" kesinlik yanılsaması verir
  const round10 = (x: number) => Math.round(x / 10) * 10;
  return { low: round10(t * ESTIMATE_BAND.low), high: round10(t * ESTIMATE_BAND.high) };
}
