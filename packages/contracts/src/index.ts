/**
 * API sözleşmesi — tek doğruluk kaynağı backend'in ürettiği OpenAPI şeması.
 *
 * `pnpm -C packages/contracts generate` komutu çalışan API'den `src/generated/api.d.ts`
 * dosyasını üretir. CI, üretilen dosya ile commit'lenen arasında fark bulursa build'i kırar —
 * böylece backend bir alanı değiştirdiğinde frontend derleme zamanında haberdar olur.
 */

export type Money = { amount: string; currency: 'TRY' };

export type Estimate = {
  volumeM3: number;
  weightKg: number;
  longestEdgeCm: number;
};

export type VehicleType = {
  code: string;
  displayName: string;
  volumeM3: number;
  payloadKg: number;
  innerLengthCm: number;
  exampleLoads: string | null;
  sortOrder: number;
};

export type CargoCategory = {
  code: string;
  displayName: string;
  scaleHint: string;
  typicalVolumeMinM3: number | null;
  typicalVolumeMaxM3: number | null;
  defaultVehicleTypeCode: string | null;
  detailFormType: string;
  sortOrder: number;
};

export type CargoItem = {
  code: string;
  categoryCode: string;
  displayName: string;
  volumeM3: number;
  weightKg: number;
  longestEdgeCm: number;
};

export type VehicleRecommendation = {
  estimate: Estimate;
  primary: RecommendationOption;
  alternatives: RecommendationOption[];
  suggestedExtras: { code: string; reason: string }[];
};

export type RecommendationOption = {
  vehicleTypeCode: string;
  displayName: string;
  fillRatePercent: number;
  reason: string;
  whyNotSmaller: { vehicleTypeCode: string; reason: string } | null;
};

export type CargoPreset = {
  code: string;
  categoryCode: string;
  displayName: string;
  estimatedVolumeM3: number;
  estimatedWeightKg: number;
  sortOrder: number;
};

/** Öneri isteği — kategori paneli ve detay adımının çıktısı. */
export type CargoDeclarationRequest = {
  categoryCode: string;
  items?: { cargoItemCode: string; quantity: number }[];
  presetCode?: string | null;
  packageCount?: number | null;
  stops?: { floor?: number | null; hasElevator?: boolean | null }[];
};

export type District = {
  id: string;
  cityCode: string;
  cityName: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
};

export type ExtraService = {
  code: string;
  displayName: string;
  description: string | null;
  pricingType: 'FIXED' | 'PER_UNIT' | 'PERCENT';
  rate: number;
  unitLabel: string | null;
  sortOrder: number;
};

export type BreakdownLine = {
  code: string;
  label: string;
  amount: Money;
  note: string | null;
};

export type Quote = {
  quoteId: string;
  serviceModel: string;
  vehicleTypeCode: string;
  distanceMeters: number;
  durationSeconds: number;
  /** true ise mesafe gerçek yol ağından değil takribî hesaplandı — kullanıcıya bildirilir. */
  approximateDistance: boolean;
  breakdown: BreakdownLine[];
  totalAmount: Money;
  floorPrice: Money;
  expiresAt: string;
  signature: string;
};

export type QuoteRequest = {
  serviceModel: 'INSTANT' | 'SCHEDULED';
  vehicleTypeCode: string;
  stops: { districtId: string; floor?: number | null; hasElevator?: boolean | null }[];
  extraServices?: string[];
  couponCode?: string | null;
};
