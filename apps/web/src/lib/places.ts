import type { District } from '@tasiyoruz/contracts';
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

/**
 * Yerel veriyi hizmet katalogla birleştirir.
 *
 * <p><strong>Neden gerekiyor:</strong> {@code PLACES} yalnızca İstanbul ve
 * Ankara'yı mahalle derinliğinde biliyor — açılış illeri. Katalog ise 81 ilin
 * tamamını taşıyor. Yalnızca yerel veriyle çalışıldığında İzmir, Bursa, Konya
 * gibi illerde Nereden/Nereye alanında <em>seçilecek hiçbir şey çıkmıyordu</em>:
 * kullanıcı yazıyor, liste boş kalıyor, elle yazdığı metin katalogla
 * eşleşmediği için rota çözülemiyor ve panel "eksik" demeye devam ediyordu.
 * Şehirlerarası taşıma açıldıktan sonra bu, ilan vermeyi fiilen imkânsız
 * kılıyordu.
 *
 * <p>Birleştirme derinliği bozmuyor: yerel veride zaten var olan ilçe olduğu
 * gibi kalıyor (mahalleleriyle), katalogdakilerden yalnızca eksik olanlar
 * ekleniyor.
 */
export function mergePlaces(base: CityPlaces[], catalog: District[] | null | undefined): CityPlaces[] {
  if (!catalog || catalog.length === 0) return base;

  const byCity = new Map<string, CityPlaces>();
  for (const c of base) byCity.set(normalize(c.city), { city: c.city, districts: [...c.districts] });

  for (const d of catalog) {
    const key = normalize(d.cityName);
    const mevcut = byCity.get(key);
    if (!mevcut) {
      byCity.set(key, { city: d.cityName, districts: [[d.name, []]] });
      continue;
    }
    const varMi = mevcut.districts.some(([ad]) => normalize(ad) === normalize(d.name));
    if (!varMi) mevcut.districts.push([d.name, []]);
  }

  // İl sırası Türkçe alfabetik: kullanıcı listeyi tarayabilsin
  return [...byCity.values()]
    .map((c) => ({
      ...c,
      districts: [...c.districts].sort((a, b) => a[0].localeCompare(b[0], 'tr')),
    }))
    .sort((a, b) => a.city.localeCompare(b.city, 'tr'));
}

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
 * Yazılan adresten mahalle/semt adını çıkarır; yoksa null.
 *
 * <p>{@link formatPlace} biçiminin tersi. Kullanıcı zaten mahalleyi seçiyordu ama
 * ilçeye çevrilirken atılıyordu; teklif veren araç sahibi "Kadıköy" görüp yolun
 * ne kadarını çıkacağını bilemiyordu.
 *
 * <p>Elle yazılmış bir metin de gelebilir: ayraç yoksa ya da arkası boşsa null
 * dönüyor, uydurulmuş bir semt ilana yazılmıyor.
 */
export function neighborhoodOf(value: string): string | null {
  const [, neighborhood] = value.split(' - ');
  const trimmed = neighborhood?.trim();
  return trimmed ? trimmed.slice(0, 96) : null;
}

/**
 * Her harfte daralan arama. İlçeler önce, mahalleler ilçesine göre gruplanmış hâlde
 * altta. Boş sorguda tüm ilçeler listelenir (mahalle yok — 2.000+ satır anlamsız).
 *
 * <p>Sıralama: tam ön ek eşleşmesi > kelime başı eşleşmesi > alfabetik (tr).
 */
export function searchPlaces(
  data: CityPlaces[],
  query: string,
): PlaceOption[] {
  const q = normalize(query);
  const collator = new Intl.Collator('tr-TR');
  const cities = data;

  if (!q) {
    return cities.flatMap((c) =>
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

  for (const c of cities) {
    /*
     * İL ADI da eşleşiyor. Eşleşmediğinde "izmir" yazan kullanıcı boş liste
     * görüyordu: İzmir'in katalogdaki tek ilçesi "Merkez" ve kimse yer ararken
     * önce "merkez" yazmıyor. İl adıyla bulunan ilçeler ilçe adıyla bulunanların
     * ARKASINA düşüyor — "Kadıköy" arayan biri önce Kadıköy'ü görmeli.
     */
    const cs = score(c.city, q);
    for (const [district, hoods] of c.districts) {
      const ds = Math.max(score(district, q), cs ? 1 : 0) as 0 | 1 | 2;
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

/** Alandaki metnin ili; henüz bir yer seçilmemişse null. */
export function cityOf(value: string): string | null {
  return parsePlace(value)?.city ?? null;
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
