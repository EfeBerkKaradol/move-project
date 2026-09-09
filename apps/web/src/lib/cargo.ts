/**
 * Komple yük çeken araçlar.
 *
 * <p>Bu araca gelen kullanıcı ev eşyası taşımıyor: ona koltuk ve buzdolabı listesi
 * göstermek, aradığı paleti otuz kalem arasında aratmak olur. Hem fiyat akışında hem
 * ilan formunda gerekiyor ve ikisinin ayrışması, bir tarafta palet seçip diğerinde
 * seçememek gibi tutarsız bir ürüne yol açardı — bu yüzden tek yerde.
 */
export const FULL_LOAD_VEHICLES = ['KAMYON', 'TIR'];

/** Komple yük kalemleri: palet, tomruk, big-bag, makine, karışık kargo (V18). */
export const FULL_LOAD_CATEGORY = 'KOMPLE';

/** Ev ve ofis taşımasında seçilebilecekler: tekil eşya, koli ve zarf. */
export const PARCEL_CATEGORIES = ['TEKIL_ESYA', 'KOLI', 'BELGE_PAKET'];

export function isFullLoad(vehicleCode: string): boolean {
  return FULL_LOAD_VEHICLES.includes(vehicleCode);
}

/** Bu araçla taşınabilecek kalemlerin kategorileri. */
export function categoriesFor(vehicleCode: string): string[] {
  return isFullLoad(vehicleCode) ? [FULL_LOAD_CATEGORY] : PARCEL_CATEGORIES;
}

/**
 * Tarif formundaki seçimi, ilanın istediği kalem satırlarına çevirir.
 *
 * <p>İki ayrı giriş biçimi tek listede birleşiyor: kalem kalem seçim ve "kaç
 * paket" sayacı. Sayaç bir eşya kodu taşımıyor; kategorinin
 * {@code defaultPackageItemCode} alanı onun karşılığı (V2 kataloğu: KOLI →
 * KOLI_STANDART, BELGE_PAKET → PAKET_KUCUK).
 *
 * <p>Çeviri burada duruyor çünkü iki ekran birden kullanıyor: fiyat adımında
 * beyanın tamamlanıp tamamlanmadığına, ilan adımında forma ne yazılacağına
 * karar veriyor. Ayrışsalardı kullanıcı fiyat sayfasında "20 koli" deyip ilan
 * sayfasında hiçbir şey seçilmemiş bulurdu.
 */
export function declaredItems(
  category: { defaultPackageItemCode?: string | null } | null,
  selection: { itemQuantities: Record<string, number>; packageCount: number },
): Record<string, number> {
  const lines: Record<string, number> = {};
  for (const [code, quantity] of Object.entries(selection.itemQuantities)) {
    if (quantity > 0) lines[code] = quantity;
  }

  const packageItem = category?.defaultPackageItemCode;
  if (selection.packageCount > 0 && packageItem) {
    // Kullanıcı hem kalem olarak koli seçip hem sayacı kullanmış olabilir;
    // adetler toplanıyor, ilanda tek satır görünsün
    lines[packageItem] = (lines[packageItem] ?? 0) + selection.packageCount;
  }

  return lines;
}

/** URL'de taşınan biçim: "KOLI_STANDART:20,KOLTUK_L:1". */
export function encodeItems(lines: Record<string, number>): string {
  return Object.entries(lines)
    .filter(([, q]) => q > 0)
    .map(([code, q]) => `${code}:${q}`)
    .join(',');
}

/**
 * URL'den okunan beyan. Adres çubuğu elle kurcalanabiliyor: tanınmayan kod ya
 * da sayı olmayan adet, formu kilitlemek yerine sessizce atılıyor — sunucu
 * zaten bilinmeyen kodu reddediyor.
 */
export function decodeItems(raw: string, known?: Set<string>): Record<string, number> {
  const lines: Record<string, number> = {};
  for (const part of raw.split(',')) {
    const [code, rawQuantity] = part.split(':');
    if (!code || !rawQuantity) continue;
    if (known && !known.has(code)) continue;
    const quantity = Number(rawQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 999) continue;
    lines[code] = (lines[code] ?? 0) + quantity;
  }
  return lines;
}
