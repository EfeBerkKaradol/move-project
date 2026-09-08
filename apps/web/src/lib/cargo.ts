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
