/**
 * API sözleşmesi — tek doğruluk kaynağı backend'in ürettiği OpenAPI şeması.
 *
 * `pnpm -C packages/contracts generate` komutu çalışan API'den `src/generated/api.d.ts`
 * dosyasını üretir. CI, üretilen dosya ile commit'lenen arasında fark bulursa build'i kırar —
 * böylece backend bir alanı değiştirdiğinde frontend derleme zamanında haberdar olur.
 */

/**
 * Para değeri. `amount` **string** — sayı olsaydı IEEE-754 float'a dönüşüp
 * kuruş kaybı yaşanırdı. Gösterim için `formatPrice()` kullan.
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
  /** false ise araç henüz hizmete açılmadı — arayüzde "Yakında" gösterilir. */
  active: boolean;
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


// ── Teklif pazarı (docs/05 §4b) ─────────────────────────────────────

export type ListingStatus = 'OPEN' | 'AWARDED' | 'EXPIRED' | 'CANCELLED';
export type OfferStatus = 'SUBMITTED' | 'WITHDRAWN' | 'ACCEPTED' | 'REJECTED';

export type ListingPlace = {
  districtId: string;
  cityName: string | null;
  districtName: string | null;
  floor: number | null;
  hasElevator: boolean | null;
};

export type ListingView = {
  id: string;
  listingNumber: string;
  /** Taşıyıcıya gösterilen görünümde null. */
  shipperId: string | null;
  serviceModel: 'INSTANT' | 'SCHEDULED';
  vehicleTypeCode: string;
  pickup: ListingPlace;
  dropoff: ListingPlace;
  extraServices: string[];
  cargoDescription: string | null;
  pickupWindowStart: string | null;
  pickupWindowEnd: string | null;
  estimatedAmount: Money;
  estimate: Quote;
  status: ListingStatus;
  awardedOfferId: string | null;
  offerCount: number;
  publishedAt: string;
  expiresAt: string;
};

export type OfferView = {
  id: string;
  listingId: string;
  carrierId: string;
  /** Doğrulanmış profilden; profil yoksa teklif kaydındaki ad. */
  carrierDisplayName: string | null;
  vehicleTypeCode: string | null;
  plate: string | null;
  /** Profil onaylı mı. */
  verified: boolean;
  amount: Money;
  note: string | null;
  estimatedPickupAt: string | null;
  status: OfferStatus;
  submittedAt: string;
  respondedAt: string | null;
};

// ── Puanlama ────────────────────────────────────────────────────────

export type CarrierRatingView = {
  carrierId: string;
  /** Hiç puan yoksa null — uydurma 5,0 gösterilmez. */
  averageScore: number | null;
  ratingCount: number;
  completedJobs: number;
};

export type RatingView = {
  id: string;
  tripId: string;
  carrierId: string;
  score: number;
  comment: string | null;
  createdAt: string;
};

// ── Bildirim geçmişi (operasyon) ────────────────────────────────────

export type NotificationView = {
  id: string;
  recipientId: string;
  recipient: string | null;
  kind: string;
  subject: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  error: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type CreateListingRequest = {
  serviceModel: 'INSTANT' | 'SCHEDULED';
  vehicleTypeCode: string;
  pickup: { districtId: string; floor?: number | null; hasElevator?: boolean | null };
  dropoff: { districtId: string; floor?: number | null; hasElevator?: boolean | null };
  extraServices?: string[];
  cargoDescription?: string | null;
  pickupWindowStart?: string | null;
  pickupWindowEnd?: string | null;
};


// ── Taşıma yürütme (docs/04 §3.1) ───────────────────────────────────

export type TripStage =
  | 'DRIVER_ASSIGNED' | 'EN_ROUTE_TO_PICKUP' | 'ARRIVED_AT_PICKUP' | 'LOADING' | 'IN_TRANSIT'
  | 'ARRIVED_AT_DROPOFF' | 'UNLOADING' | 'DELIVERED' | 'COMPLETED';

export const TRIP_STAGE_LABELS: Record<TripStage, string> = {
  DRIVER_ASSIGNED: 'Taşıyıcı atandı',
  EN_ROUTE_TO_PICKUP: 'Alış noktasına yolda',
  ARRIVED_AT_PICKUP: 'Alış noktasında',
  LOADING: 'Yükleniyor',
  IN_TRANSIT: 'Yolda',
  ARRIVED_AT_DROPOFF: 'Teslim noktasında',
  UNLOADING: 'Boşaltılıyor',
  DELIVERED: 'Teslim edildi',
  COMPLETED: 'Tamamlandı',
};

export type TripPhotoKind = 'PICKUP' | 'DELIVERY' | 'DAMAGE';

export const TRIP_PHOTO_KIND_LABELS: Record<TripPhotoKind, string> = {
  PICKUP: 'Yükleme',
  DELIVERY: 'Teslim',
  DAMAGE: 'Hasar',
};

export type TripPhotoView = {
  id: string;
  kind: TripPhotoKind;
  kindDisplayName: string;
  contentType: string;
  sizeBytes: number;
  /** Kimin çektiği; uyuşmazlıkta belirleyici. */
  uploadedByRole: 'DRIVER' | 'SHIPPER';
  uploadedAt: string;
};

export type TripView = {
  id: string;
  listingId: string;
  shipperId: string;
  carrierId: string;
  carrierDisplayName: string | null;
  agreedAmount: Money;
  stage: TripStage;
  /** Taşıyıcının geçebileceği sonraki aşama; DELIVERED/COMPLETED'da null. */
  nextStage: TripStage | null;
  events: { stage: TripStage; occurredAt: string; source: 'DRIVER' | 'SHIPPER' | 'SYSTEM'; note: string | null }[];
  photos: TripPhotoView[];
  proofOfDelivery: { receivedByName: string; note: string | null } | null;
  startedAt: string;
  deliveredAt: string | null;
  completedAt: string | null;
};


// ── Boş dönüş koridorları (docs/11 §3) ──────────────────────────────

export type CorridorStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED';

export const CORRIDOR_STATUS_LABELS: Record<CorridorStatus, string> = {
  ACTIVE: 'Yayında',
  PAUSED: 'Duraklatıldı',
  EXPIRED: 'Süresi doldu',
};

export type MatchOutcome = 'PENDING' | 'OFFERED' | 'IGNORED' | 'EXPIRED';

export type CorridorPlace = {
  districtId: string;
  cityName: string | null;
  districtName: string | null;
};

export type CorridorView = {
  id: string;
  vehicleTypeCode: string;
  origin: CorridorPlace;
  destination: CorridorPlace;
  departureFrom: string;
  departureTo: string;
  detourToleranceKm: number;
  /** Taşıyıcı alt sınır koymadıysa null. */
  minAmount: Money | null;
  status: CorridorStatus;
  createdAt: string;
  pendingMatchCount: number;
};

export type CorridorMatchView = {
  id: string;
  corridorId: string;
  /** 0-1 arası; bileşenleri sapma, zaman uyumu ve kilometre başına kazanç. */
  score: number;
  /** İlanın koridora eklediği ekstra yol. */
  detourKm: number;
  outcome: MatchOutcome;
  matchedAt: string;
  listing: ListingView;
};

export type CreateCorridorRequest = {
  vehicleTypeCode: string;
  originDistrictId: string;
  destinationDistrictId: string;
  departureFrom: string;
  departureTo: string;
  detourToleranceKm: number;
  minAmount?: string | null;
};


// ── Taşıyıcı başvurusu ve belgeler (docs/01 §4.2) ───────────────────

export type CarrierStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export const CARRIER_STATUS_LABELS: Record<CarrierStatus, string> = {
  DRAFT: 'Taslak',
  PENDING_REVIEW: 'İncelemede',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
  SUSPENDED: 'Askıya alındı',
};

export type DocumentKind =
  | 'DRIVING_LICENCE' | 'VEHICLE_REGISTRATION' | 'TRAFFIC_INSURANCE'
  | 'SRC' | 'K_DOCUMENT' | 'CRIMINAL_RECORD' | 'TAX_PLATE';

/** Neden istendiği — başvuru ekranında belgenin altında görünür. */
export const DOCUMENT_KIND_HINTS: Record<DocumentKind, string> = {
  DRIVING_LICENCE: 'Kullanacağın araç sınıfına uygun ehliyet.',
  VEHICLE_REGISTRATION: 'Aracın kime kayıtlı olduğu ve azami yüklü ağırlığı buradan doğrulanır.',
  TRAFFIC_INSURANCE: 'Zorunlu trafik sigortası poliçesi. Son kullanma tarihini de gir.',
  SRC: 'Ticari yük taşıyan sürücüler için mesleki yeterlilik belgesi.',
  K_DOCUMENT: 'Ulaştırma Bakanlığı yetki belgesi.',
  CRIMINAL_RECORD: 'İsteğe bağlı; güven puanını yükseltir.',
  TAX_PLATE: 'Firma adına başvuruyorsan zorunlu.',
};

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDING: 'İncelenecek',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
  EXPIRED: 'Süresi doldu',
};

export type CarrierDocumentView = {
  id: string;
  kind: DocumentKind;
  kindDisplayName: string;
  contentType: string;
  sizeBytes: number;
  originalFilename: string | null;
  /** Süresiz belgelerde null. */
  expiresOn: string | null;
  status: DocumentStatus;
  rejectionReason: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
};

export type CarrierProfileView = {
  id: string;
  /** Keycloak subject; operasyon uçları taşıyıcıyı bununla adresliyor. */
  carrierId: string;
  displayName: string;
  phone: string | null;
  companyName: string | null;
  taxId: string | null;
  vehicleTypeCode: string;
  plate: string;
  status: CarrierStatus;
  reviewNote: string | null;
  documents: CarrierDocumentView[];
  /** Henüz yüklenmemiş zorunlu belgeler; eksik listesi bundan çizilir. */
  missingDocuments: DocumentKind[];
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type CarrierApplicationRequest = {
  displayName: string;
  phone?: string | null;
  companyName?: string | null;
  taxId?: string | null;
  vehicleTypeCode: string;
  plate: string;
};


// ── Operasyon paneli (docs/01 §4.13) ────────────────────────────────

export type OverviewView = {
  openListings: number;
  listingsAwaitingOffer: number;
  activeTrips: number;
  completedTrips: number;
  carriersPendingReview: number;
  approvedCarriers: number;
  suspendedCarriers: number;
  activeCorridors: number;
  /** 30 gün içinde süresi dolacak onaylı belge sayısı. */
  documentsExpiringSoon: number;
  /** Tamamlanan işlerin toplam tutarı — komisyonsuz dönemde ciro değil, hacim. */
  completedVolume: Money;
};

export type ExpiringDocumentView = {
  carrierId: string;
  carrierName: string;
  plate: string;
  kind: DocumentKind;
  kindDisplayName: string;
  expiresOn: string;
  /** Negatifse süre dolmuş ama gece taraması henüz işaretlememiş. */
  daysLeft: number;
};


// ── Güven panosu sayaçları (docs/09) ────────────────────────────────

export type PublicStatsView = {
  openListings: number;
  verifiedCarriers: number;
  /** Örneklem yetersizse null; arayüz tire gösterir. */
  averageMinutesToFirstOffer: number | null;
};
