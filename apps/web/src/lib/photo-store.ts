/**
 * Fiyat adımında seçilen yük fotoğrafları — tarayıcıda, sunucuya gitmeden.
 *
 * <p>Fotoğraf artık üye olmadan isteniyor. En kolay yol sunucuya anonim bir
 * yükleme ucu açmaktı; açılmadı. İki sebep var ve ikisi de kalıcı:
 *
 * <ul>
 *   <li><strong>Gizlilik.</strong> Bunlar birinin evinin içi. Hiç üye olmayacak
 *       bir ziyaretçinin salonunun fotoğrafını depomuza almak, sonra silmek
 *       zorunda kalacağımız kişisel veri biriktirmek olur. Almazsak silmemiz de
 *       gerekmez.</li>
 *   <li><strong>Kötüye kullanım.</strong> Kimlik istemeyen bir dosya yükleme
 *       ucu, depoyu doldurmanın ve barındırmak istemediğimiz içeriği bize
 *       koydurmanın hazır yoludur.</li>
 * </ul>
 *
 * <p>Kareler kullanıcının kendi diskinde bekliyor ve ilan yayınlanırken —
 * yani kimlik belli olduktan sonra — mevcut kimlikli uçtan yükleniyor. Giriş
 * Keycloak'a gidip geri dönen tam bir sayfa gezinmesi olduğu için React durumu
 * kayboluyor; IndexedDB aynı köken altında kaldığından dönüşte duruyor.
 *
 * <p>Bedeli şu: kullanıcı fiyatı telefonda alıp ilanı bilgisayardan yayınlarsa
 * fotoğraflar gelmiyor, yeniden seçmesi gerekiyor. Sunucuya yüklemenin bedeli
 * ise yukarıdaki iki madde; bu değiş tokuşu bilerek böyle yaptık.
 */

const DB = 'karinca';
const STORE = 'bekleyen-fotograflar';

/** Yarım kalmış bir akışın kareleri kullanıcının diskinde süresiz durmasın. */
const OMUR_MS = 24 * 60 * 60 * 1000;

export type BekleyenFotograf = {
  id: string;
  name: string;
  type: string;
  size: number;
  /** Kaydedildiği an; süresi geçenler okurken eleniyor. */
  eklendi: number;
  blob: Blob;
};

/** Süresi dolmuş kayıt. Ayrı durması test edilebilmesi için. */
export function suresiDoldu(kayit: { eklendi: number }, simdi = Date.now()): boolean {
  return simdi - kayit.eklendi > OMUR_MS;
}

/**
 * IndexedDB her ortamda yok: gizli sekmede, site verisi kapalı tarayıcıda ve
 * sunucu tarafı render sırasında erişilemiyor. Bu modülün tamamı bunu bir hata
 * değil normal bir durum sayıyor — çağıran taraf boş liste görür ve akış
 * o sayfa açıkken bellekteki dosyalarla yürür.
 */
function ac(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    let istek: IDBOpenDBRequest;
    try {
      istek = indexedDB.open(DB, 1);
    } catch {
      return resolve(null);
    }
    istek.onupgradeneeded = () => {
      const db = istek.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    istek.onsuccess = () => resolve(istek.result);
    istek.onerror = () => resolve(null);
    // Başka bir sekme eski sürümü tutuyorsa açılış asılı kalır; akış beklemesin
    istek.onblocked = () => resolve(null);
  });
}

function isle<T>(
  mod: IDBTransactionMode,
  is: (store: IDBObjectStore) => IDBRequest,
  varsayilan: T,
): Promise<T> {
  return ac().then(
    (db) =>
      new Promise<T>((resolve) => {
        if (!db) return resolve(varsayilan);
        try {
          const istek = is(db.transaction(STORE, mod).objectStore(STORE));
          istek.onsuccess = () => resolve((istek.result as T) ?? varsayilan);
          istek.onerror = () => resolve(varsayilan);
        } catch {
          resolve(varsayilan);
        }
      }),
  );
}

/**
 * @returns kayıt ve diske gerçekten yazılıp yazılmadığı. Yazılamadıysa kare o
 *   sayfa açık kaldığı sürece çalışıyor ama girişten sonra kaybolur; çağıran
 *   taraf kullanıcıyı uyarabilsin diye sessizce yutulmuyor.
 */
export async function fotografEkle(
  file: File,
): Promise<{ kayit: BekleyenFotograf; kalici: boolean }> {
  const kayit: BekleyenFotograf = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    eklendi: Date.now(),
    blob: file,
  };
  const anahtar = await isle<IDBValidKey | null>('readwrite', (s) => s.put(kayit), null);
  return { kayit, kalici: anahtar !== null };
}

export async function fotograflariOku(): Promise<BekleyenFotograf[]> {
  const hepsi = await isle<BekleyenFotograf[]>('readonly', (s) => s.getAll(), []);
  const taze = hepsi.filter((k) => !suresiDoldu(k));
  // Elenenler diskte kalmasın; okuma sırasında temizlemek ayrı bir süpürme
  // işine gerek bırakmıyor
  for (const eski of hepsi.filter((k) => suresiDoldu(k))) await fotografSil(eski.id);
  return taze.sort((a, b) => a.eklendi - b.eklendi);
}

export async function fotografSil(id: string): Promise<void> {
  await isle('readwrite', (s) => s.delete(id), undefined);
}

export async function fotograflariTemizle(): Promise<void> {
  await isle('readwrite', (s) => s.clear(), undefined);
}
