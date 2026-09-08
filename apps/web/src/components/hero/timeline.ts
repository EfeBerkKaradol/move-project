/**
 * Hero sahnesinin zaman çizelgesi.
 *
 * <p>Saf fonksiyon: kaydırma ilerlemesi (0–1) girer, sahnenin o andaki bütün durumu
 * çıkar. React'ten ve DOM'dan bağımsız olması bilinçli — kare başına hesaplanan bu
 * mantığın testi olmadan hangi fazın nerede başladığını kimse doğrulayamaz.
 *
 * <p>Anlatı iki ölçekte: önce İstanbul'da yükleme ve Boğaz geçişi (Avrupa yakasından
 * Anadolu yakasına), sonra kamera geri çekilip ülke ölçeğinde Ankara'ya sefer, varış,
 * boş dönüş ve dönüşe bulunan yük. Her faz ürünün bir mekanizmasını anlatıyor.
 */

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** a→b aralığında 0'dan 1'e yumuşak geçiş (smoothstep). */
export function ramp(p: number, a: number, b: number): number {
  if (b <= a) return p >= b ? 1 : 0;
  const t = clamp01((p - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** a→b'de görünür olup c→d'de kaybolan öğeler için. */
function window_(p: number, a: number, b: number, c: number, d: number): number {
  return ramp(p, a, b) * (1 - ramp(p, c, d));
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Araç hangi yolda: şehir içi, sahne devri, gidiş, dönüş. */
export type Leg = 'city' | 'handover' | 'out' | 'back';

export type SceneState = {
  /** İstanbul yakın planı ve ülke haritasının görünürlüğü (çapraz geçiş). */
  istanbulIn: number;
  turkeyIn: number;
  /** Kamera geri çekilirken haritaların ölçeği. */
  istanbulZoom: number;
  turkeyZoom: number;

  /**
   * Fiyat sorgusunun belirginliği (0–1). Açılışta harita ön planda, widget
   * silik bir katman; kaydırma ilerledikçe öne çıkıyor.
   */
  widgetIn: number;

  leg: Leg;
  legProgress: number;
  /** Sahne devri sırasında aracın iki sahne arasındaki geçiş oranı. */
  handover: number;
  truckIn: number;

  /** Rota çizgilerinin çizilme oranı. */
  cityDraw: number;
  outboundDraw: number;
  returnDraw: number;
  /** Dönüş rotasının boştan yüklüye dönüşmesi: 0 kesikli/soluk, 1 dolu/lime. */
  returnLoaded: number;

  nodes: {
    pickup: number;
    bridge: number;
    exit: number;
    istanbul: number;
    ankara: number;
    izmir: number;
  };
  cards: { cargo: number; match: number; newLoad: number };
  texts: {
    intro: number;
    enterLoad: number;
    crossing: number;
    arrival: number;
    empty: number;
    outro: number;
  };
};

/** Fazların sınırları tek yerde; kaydırmak isteyen buraya bakar. */
/**
 * Fazların sınırları tek yerde; kaydırmak isteyen buraya bakar.
 *
 * <p>Kural: bir metin bitmeden sonraki başlamaz. Pencereler geniş tutulduğunda
 * iki başlık aynı anda yarı saydam duruyor ve ikisi de okunmuyordu — çapraz
 * geçiş değil, üst üste binme oluyordu. `metinlerCakismaz` testi bunu koruyor.
 */
export const MARKS = {
  mapIn: [0.02, 0.18],
  introOut: [0.1, 0.17],
  truckIn: [0.15, 0.21],
  pickup: [0.13, 0.19],
  enterLoad: [0.16, 0.23, 0.24, 0.28],
  city: [0.22, 0.36],
  bridge: [0.27, 0.32],
  crossing: [0.28, 0.32, 0.36, 0.4],
  handover: [0.36, 0.44],
  outbound: [0.44, 0.62],
  match: [0.47, 0.53, 0.62, 0.67],
  ankara: [0.6, 0.65],
  arrival: [0.62, 0.67, 0.68, 0.72],
  empty: [0.72, 0.76],
  /** "Yüklü dönüş" cümlesi, kapanış başlığı gelmeden önce sönmeli. */
  emptyOut: [0.9, 0.94],
  newLoad: [0.76, 0.81, 0.9, 0.95],
  loaded: [0.78, 0.86],
  back: [0.8, 0.94],
  izmir: [0.92, 0.96],
  outro: [0.94, 0.99],
  /** Widget bu aralıkta silikten tam görünüre geçer. */
  widget: [0.08, 0.5],
} as const;

export function sceneAt(p: number): SceneState {
  const progress = clamp01(p);
  const m = MARKS;

  const mapIn = ramp(progress, m.mapIn[0], m.mapIn[1]);
  const handover = ramp(progress, m.handover[0], m.handover[1]);
  const city = ramp(progress, m.city[0], m.city[1]);
  const outbound = ramp(progress, m.outbound[0], m.outbound[1]);
  const back = ramp(progress, m.back[0], m.back[1]);

  let leg: Leg;
  let legProgress: number;
  if (progress >= m.back[0]) {
    leg = 'back';
    legProgress = back;
  } else if (progress >= m.handover[1]) {
    leg = 'out';
    legProgress = outbound;
  } else if (progress >= m.handover[0]) {
    leg = 'handover';
    legProgress = 1;
  } else {
    leg = 'city';
    legProgress = city;
  }

  return {
    // Yakın plan geri çekilirken ülke haritası açılıyor; ikisi bir an birlikte var
    istanbulIn: mapIn * (1 - handover),
    turkeyIn: handover,
    // İstanbul biraz küçülür, Türkiye yakından normale gelir: kamera geri çekiliyor
    istanbulZoom: mix(1, 0.78, handover),
    turkeyZoom: mix(1.35, 1, handover),

    widgetIn: ramp(progress, m.widget[0], m.widget[1]),

    leg,
    legProgress,
    handover,
    truckIn: ramp(progress, m.truckIn[0], m.truckIn[1]),

    cityDraw: city,
    outboundDraw: outbound,
    // Dönüş çizgisi araçtan önce belirir: kullanıcı "boş dönecek" fikrini
    // araç hareket etmeden önce görmeli
    returnDraw: ramp(progress, m.empty[0], m.empty[1] + 0.06),
    returnLoaded: ramp(progress, m.loaded[0], m.loaded[1]),

    nodes: {
      pickup: ramp(progress, m.pickup[0], m.pickup[1]),
      bridge: ramp(progress, m.bridge[0], m.bridge[1]),
      exit: ramp(progress, m.city[1] - 0.03, m.city[1]),
      istanbul: handover,
      ankara: ramp(progress, m.ankara[0], m.ankara[1]),
      izmir: ramp(progress, m.izmir[0], m.izmir[1]),
    },
    cards: {
      cargo: window_(progress, m.enterLoad[0], m.enterLoad[1], m.enterLoad[2], m.enterLoad[3]),
      match: window_(progress, m.match[0], m.match[1], m.match[2], m.match[3]),
      newLoad: window_(progress, m.newLoad[0], m.newLoad[1], m.newLoad[2], m.newLoad[3]),
    },
    texts: {
      intro: 1 - ramp(progress, m.introOut[0], m.introOut[1]),
      enterLoad: window_(progress, m.enterLoad[0], m.enterLoad[1], m.enterLoad[2], m.enterLoad[3]),
      crossing: window_(progress, m.crossing[0], m.crossing[1], m.crossing[2], m.crossing[3]),
      arrival: window_(progress, m.arrival[0], m.arrival[1], m.arrival[2], m.arrival[3]),
      // Boş/yüklü dönüş cümlesi kapanıştan ÖNCE söner. Sönmesi outro'nun
      // belirmesine bağlanmıştı ve ikisi bir aralıkta birlikte okunuyordu.
      empty:
        ramp(progress, m.empty[0], m.empty[1]) *
        (1 - ramp(progress, m.emptyOut[0], m.emptyOut[1])),
      outro: ramp(progress, m.outro[0], m.outro[1]),
    },
  };
}
