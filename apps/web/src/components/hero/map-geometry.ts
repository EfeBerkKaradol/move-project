/**
 * Sahnenin coğrafyası. Bileşenlerden ayrı tutuldu: hem araç konumu hesabı hem SVG
 * çizimi aynı sayıları kullanmak zorunda, iki yerde durursa kayarlar.
 *
 * <p>Harita coğrafi olarak doğru değil, okunur olacak kadar sadeleştirilmiş bir
 * silüet. Çerçeve batıyı kadraja alıyor; ülkenin doğusu sağ kenardan taşıyor.
 * Amaç kartografi değil, "araç gerçekten bir rota üzerinde" hissi.
 */

/** Silüetin çizildiği koordinat uzayı. */
export const MAP_BOX = { x: 20, y: 45, w: 690, h: 320 } as const;
export const MAP_VIEWBOX = `${MAP_BOX.x} ${MAP_BOX.y} ${MAP_BOX.w} ${MAP_BOX.h}`;

export const TURKEY_PATH =
  'M74 236L92 190L128 176L112 150L150 132L176 118L214 100L268 110L330 100L404 86' +
  'L500 76L596 80L690 92L772 88L856 104L924 132L968 172L934 206L956 240L900 268' +
  'L812 274L726 292L640 298L552 312L452 318L372 306L306 296L240 278L176 272L128 254Z';

export type City = { id: 'istanbul' | 'ankara' | 'izmir'; label: string; x: number; y: number };

export const CITIES: City[] = [
  { id: 'istanbul', label: 'İstanbul', x: 190, y: 105 },
  { id: 'ankara', label: 'Ankara', x: 400, y: 165 },
  { id: 'izmir', label: 'İzmir', x: 145, y: 225 },
];

/** Gidiş: yüklü. Dönüş: başta boş, sonra yüklü. */
export const ROUTE_OUT = 'M190 105C250 104 330 128 400 165';
export const ROUTE_BACK = 'M400 165C330 214 232 244 145 225';

/**
 * viewBox koordinatını kapsayıcı içindeki yüzdeye çevirir.
 *
 * <p>Araç SVG'nin içinde değil üstünde duran bir HTML öğesi: fotogerçekçi bir
 * görsel `<image>` olarak ölçeklenirken netliğini kaybediyor ve `<foreignObject>`
 * gereksiz ağır. Kapsayıcı ile viewBox aynı en-boy oranında olduğu için dönüşüm
 * doğrusal — `preserveAspectRatio` sapma üretmiyor.
 */
export function toPercent(x: number, y: number) {
  return {
    left: ((x - MAP_BOX.x) / MAP_BOX.w) * 100,
    top: ((y - MAP_BOX.y) / MAP_BOX.h) * 100,
  };
}
