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
