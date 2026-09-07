/**
 * Hero sahnesinin zaman çizelgesi.
 *
 * <p>Saf fonksiyon: scroll ilerlemesi (0–1) girer, sahnenin o andaki bütün durumu
 * çıkar. React'ten ve DOM'dan bağımsız olması bilinçli — kare başına hesaplanan bu
 * mantığın testi olmadan hangi fazın nerede başladığını kimse doğrulayamaz.
 *
 * <p>Anlatı: yükünü gir → rota çizilir → araç gider → varış → boş dönüş →
 * dönüşe yük bulunur → yüklü dönüş. Her faz ürünün bir mekanizmasını anlatıyor;
 * süslemek için konmuş tek bir hareket yok.
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

export type Leg = 'out' | 'back';

export type SceneState = {
  /** Haritanın belirginliği. */
  mapIn: number;
  /** Aracın görünürlüğü. */
  truckIn: number;
  /** Araç hangi rotada ve o rotanın neresinde. */
  leg: Leg;
  legProgress: number;
  /** Rota çizgilerinin çizilme oranı. */
  outboundDraw: number;
  returnDraw: number;
  /** Dönüş rotasının boştan yüklüye dönüşmesi: 0 kesikli/soluk, 1 dolu/lime. */
  returnLoaded: number;
  nodes: { istanbul: number; ankara: number; izmir: number };
  cards: { cargo: number; match: number; newLoad: number };
  texts: { intro: number; enterLoad: number; arrival: number; empty: number; outro: number };
};

/** Fazların sınırları tek yerde; kaydırmak isteyen buraya bakar. */
export const MARKS = {
  mapIn: [0.02, 0.2],
  introOut: [0.1, 0.17],
  truckIn: [0.15, 0.22],
  istanbul: [0.14, 0.2],
  enterLoad: [0.18, 0.25, 0.33, 0.39],
  outbound: [0.28, 0.55],
  match: [0.36, 0.43, 0.56, 0.62],
  ankara: [0.52, 0.57],
  arrival: [0.56, 0.62, 0.66, 0.71],
  empty: [0.66, 0.72],
  newLoad: [0.74, 0.8, 0.9, 0.95],
  loaded: [0.76, 0.85],
  back: [0.78, 0.94],
  izmir: [0.91, 0.96],
  outro: [0.93, 0.99],
} as const;

export function sceneAt(p: number): SceneState {
  const progress = clamp01(p);
  const m = MARKS;

  const outbound = ramp(progress, m.outbound[0], m.outbound[1]);
  const back = ramp(progress, m.back[0], m.back[1]);
  const onReturn = progress >= m.back[0];

  // "Boş dönüş" yazısı, yüklü dönüşe geçerken yerini bırakır
  const loaded = ramp(progress, m.loaded[0], m.loaded[1]);

  return {
    mapIn: ramp(progress, m.mapIn[0], m.mapIn[1]),
    truckIn: ramp(progress, m.truckIn[0], m.truckIn[1]),
    leg: onReturn ? 'back' : 'out',
    legProgress: onReturn ? back : outbound,
    outboundDraw: outbound,
    // Dönüş çizgisi araçtan önce belirir: kullanıcı "boş dönecek" fikrini
    // araç hareket etmeden önce görmeli
    returnDraw: ramp(progress, m.empty[0], m.empty[1] + 0.06),
    returnLoaded: loaded,
    nodes: {
      istanbul: ramp(progress, m.istanbul[0], m.istanbul[1]),
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
      arrival: window_(progress, m.arrival[0], m.arrival[1], m.arrival[2], m.arrival[3]),
      // Boş dönüş metni yüklü dönüşe geçince kaybolur — yerini outro alır
      empty: ramp(progress, m.empty[0], m.empty[1]) * (1 - ramp(progress, m.outro[0], m.outro[1])),
      outro: ramp(progress, m.outro[0], m.outro[1]),
    },
  };
}
