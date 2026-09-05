import type { District } from '@turmove/contracts';
import type { CityPlaces } from '@/data/places';

export type PlaceKind = 'district' | 'neighborhood';

export type PlaceOption = {
  kind: PlaceKind;
  city: string;
  district: string;
  /** Yalnızca mahalle seçeneklerinde dolu. */
  neighborhood?: string;
  /** Alana yazılacak metin: "İstanbul, Beşiktaş - Cihannüma" */
  value: string;
};

const MAX_DISTRICTS = 12;
const MAX_NEIGHBORHOODS = 20;

/**
 * Türkçe'ye duyarlı normalizasyon: "Beşiktaş" → "besiktas", "İSTANBUL" → "istanbul".
 * Kullanıcı ş/ç/ğ yazmadan da eşleşme bulmalı; klavye dilini ayarlamamış olabilir.
 */
export function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i')
    .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 0 = eşleşme yok, 2 = ad sorguyla başlıyor, 1 = adın bir kelimesi sorguyla başlıyor. */
function score(name: string, q: string): 0 | 1 | 2 {
  const n = normalize(name);
  if (n.startsWith(q)) return 2;
  return n.split(/[\s-]+/).some((w) => w.startsWith(q)) ? 1 : 0;
}

export function formatPlace(city: string, district: string, neighborhood?: string): string {
  return neighborhood ? `${city}, ${district} - ${neighborhood}` : `${city}, ${district}`;
}

/**
 * Her harfte daralan arama. İlçeler önce, mahalleler ilçesine göre gruplanmış hâlde
 * altta. Boş sorguda tüm ilçeler listelenir (mahalle yok — 2.000+ satır anlamsız).
 *
 * <p>Sıralama: tam ön ek eşleşmesi > kelime başı eşleşmesi > alfabetik (tr).
 */
export function searchPlaces(data: CityPlaces[], query: string): PlaceOption[] {
  const q = normalize(query);
  const collator = new Intl.Collator('tr-TR');

  if (!q) {
    return data.flatMap((c) =>
      c.districts.map(([district]) => ({
        kind: 'district' as const,
        city: c.city,
        district,
        value: formatPlace(c.city, district),
      })),
    );
  }

  const districts: { opt: PlaceOption; s: number }[] = [];
  const neighborhoods: { opt: PlaceOption; s: number }[] = [];

  for (const c of data) {
    for (const [district, hoods] of c.districts) {
      const ds = score(district, q);
      if (ds) {
        districts.push({
          s: ds,
          opt: { kind: 'district', city: c.city, district, value: formatPlace(c.city, district) },
        });
      }
      for (const hood of hoods) {
        const hs = score(hood, q);
        if (hs) {
          neighborhoods.push({
            s: hs,
            opt: {
              kind: 'neighborhood',
              city: c.city,
              district,
              neighborhood: hood,
              value: formatPlace(c.city, district, hood),
            },
          });
        }
      }
    }
  }

  districts.sort((a, b) => b.s - a.s || collator.compare(a.opt.district, b.opt.district));
  // Mahalleler ilçe adına göre gruplanır; grup içinde puan, sonra alfabetik
  neighborhoods.sort(
    (a, b) =>
      collator.compare(a.opt.district, b.opt.district) ||
      b.s - a.s ||
      collator.compare(a.opt.neighborhood!, b.opt.neighborhood!),
  );

  return [
    ...districts.slice(0, MAX_DISTRICTS).map((x) => x.opt),
    ...neighborhoods.slice(0, MAX_NEIGHBORHOODS).map((x) => x.opt),
  ];
}

/** "İstanbul, Beşiktaş - Cihannüma" → { city, district, neighborhood }. Biçim dışıysa null. */
export function parsePlace(value: string): { city: string; district: string; neighborhood?: string } | null {
  const m = value.match(/^\s*([^,]+?)\s*,\s*([^-]+?)(?:\s*-\s*(.+?))?\s*$/);
  if (!m) return null;
  return { city: m[1], district: m[2], neighborhood: m[3] || undefined };
}

/**
 * Alandaki metni fiyat motorunun tanıdığı ilçeye eşler. Eşleşme il + ilçe adıyla,
 * Türkçe normalize edilerek yapılır; mahalle fiyatı etkilemez (ilçe merkezi esas).
 * Listeden seçilmemiş serbest metin ("Hadımköy") eşleşmez → null.
 */
export function matchDistrict(districts: District[], value: string): District | null {
  const place = parsePlace(value);
  if (!place) return null;
  const city = normalize(place.city);
  const district = normalize(place.district);
  return (
    districts.find((d) => normalize(d.cityName) === city && normalize(d.name) === district) ?? null
  );
}
