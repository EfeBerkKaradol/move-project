/**
 * KARINCA tasarım tokenları — tek kaynak.
 *
 * <p>Web bunları CSS değişkeni olarak tanımlıyordu; React Native CSS okuyamıyor.
 * Değerleri mobil tarafta yeniden yazmak üçüncü bir kopya demekti (web CSS,
 * Keycloak teması, mobil) ve renkler sessizce ayrışırdı. Kaynak burası; web'in
 * globals.css'iyle aynı kaldığı testle doğrulanıyor (apps/web/src/app/theme.test.ts).
 *
 * <p>Değer değiştirmek gerektiğinde önce burası, sonra globals.css güncellenir.
 */

/** Markanın sabiti: her iki temada da aynı. */
export const accent = {
  /** Vurgu; yalnızca ürünün çekirdek fikrini işaret eden yerlerde. */
  route: '#b8e86a',
  routeHover: '#a8dc50',
  /** Lime üstünde okunan koyu yazı. */
  routeInk: '#14210a',
  routeSoft: '#eef8dc',
  /** Lime açık zeminde METİN olarak okunmuyor (1.4:1); yazı ve ikon için bu. */
  routeDeep: '#42690f',
  blue: '#4b8dff',
  warning: '#ff9b52',
  success: '#8bcf62',
} as const;

/** Sıcak açık zemin: sayfanın varsayılanı. */
export const cream = {
  bg: '#f4f2ec',
  surface: '#ffffff',
  surface2: '#eceae2',
  ink: '#171a19',
  /** Marka paletindeki gri krem zeminde AA'yı geçmiyordu; okunacak kadar koyu. */
  muted: '#676c67',
  line: '#e3e2dc',
} as const;

/** Kömür grisi: hero ve vurgulanan bölümler. Saf siyah değil. */
export const dark = {
  bg: '#171a19',
  surface: '#1f2321',
  surface2: '#282c2a',
  ink: '#ffffff',
  muted: '#9aa09b',
  /** Web'de rgb(255 255 255 / 0.11); RN alfa kanalını hex ile alıyor. */
  line: 'rgba(255,255,255,0.11)',
} as const;

/** 12–20px: yumuşak ama SaaS balonu değil. */
export const radius = {
  card: 18,
  field: 12,
  pill: 999,
} as const;

/**
 * Dokunma hedefi tabanı.
 *
 * <p>44 iOS'un, 48 Android'in önerdiği en küçük dokunma alanı. Sürücü uygulaması
 * araç içinde, tek elle ve hareket hâlinde kullanılıyor; tabanı 48'de tutuyoruz.
 */
export const touch = { min: 48 } as const;

export const typography = {
  /** Sıkı harf aralıklı grotesk — tasarımın başlık dili. */
  sans: 'Archivo',
  /** Köşeli sayılar ve harf aralıklı küçük etiketler. */
  mono: 'IBMPlexMono',
  /** Küçük büyük harfli etiket (.label-mono karşılığı). */
  label: { size: 11, letterSpacing: 1.3, textTransform: 'uppercase' },
} as const;

export type ThemeColors = typeof cream;
