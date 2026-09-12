/**
 * Hizmet verilen iller.
 *
 * <p>Ürün kararı, teknik sınır değil: diğer 77 ilin ilçe listesi elimizde ve
 * katalogda duruyor, yalnızca <em>seçime açılmıyor</em>. Bir ili açmak buraya
 * adını eklemek demek — mahalle derinliği isteniyorsa ayrıca
 * {@code scripts/build-places.mjs} o ille yeniden çalıştırılır.
 *
 * <p>Neden kapalı tutuluyor: taşıyıcı ağı olmayan bir ilde ilan yayınlamak,
 * kullanıcıyı hiç teklif gelmeyecek bir beklentiye sokuyor. Seçilebilir olmak,
 * hizmet sözü vermektir.
 */
export const SERVED_CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa'] as const;

/** Ekranda "şu an şuralarda hizmet veriyoruz" cümlesi için. */
export const SERVED_CITIES_LABEL = 'İstanbul, Ankara, İzmir ve Bursa';
