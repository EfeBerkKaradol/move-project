/**
 * Marka tek kaynaktan.
 *
 * <p>Arayüzde görünen ad burada tanımlı; paket adları (`@tasiyoruz/*`), Java paketi
 * ve veritabanı şeması bilerek dokunulmadan bırakıldı — görünen marka ile teknik
 * kimlik farklı hızlarda değişir ve ikincisini değiştirmek migration ister.
 * Ad tekrar değişirse yalnızca bu dosya güncellenir.
 */
export const BRAND = {
  name: 'KARINCA',
  /** Başlık ve logoda kullanılan okunur biçim. */
  wordmark: 'Karınca',
  slogan: 'Yol boş gitmesin.',
  /** Sloganı satırlara bölünmüş hâli — hero tipografisi bunu kullanır. */
  sloganWords: ['Yol', 'boş', 'gitmesin.'],
  promise: {
    shipper: 'Yükün için doğru aracı bul.',
    carrier: 'Aracın için doğru yükü bul.',
  },
  description:
    'Yükü olanla yolu olanı buluşturur. Rotanı gir, doğrulanmış araç sahiplerinden ' +
    'teklif al; aracın varsa dönüş yoluna düşen yükleri gör. 81 il.',
} as const;

/**
 * Hero'daki araç görseli. Fotogerçekçi bir render bu yola konur; dosya yoksa
 * bileşen çizgisel bir siluete düşer (bkz. TruckAsset).
 */
export const TRUCK_ASSET = '/assets/truck.webp';
