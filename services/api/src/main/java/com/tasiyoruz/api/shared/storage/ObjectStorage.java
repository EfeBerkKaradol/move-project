package com.tasiyoruz.api.shared.storage;

import java.io.InputStream;
import java.util.Optional;

/**
 * Nesne deposu.
 *
 * <p>Belgeler veritabanına değil nesne deposuna yazılıyor: yüklenen dosyalar birkaç MB'lık
 * fotoğraflar, {@code bytea} sütunu yedeği ve replikasyonu şişirirdi. Veritabanında
 * yalnızca anahtar duruyor.
 *
 * <p>Arayüz S3 sözleşmesine göre yazıldı; yerelde MinIO, üretimde Türkiye'de barındırılan
 * S3 uyumlu bir sağlayıcı kullanılacak (docs/01 veri yerleşimi).
 */
public interface ObjectStorage {

    /**
     * Nesneyi yazar.
     *
     * @param key         depo anahtarı; çağıran üretir ve tahmin edilemez olmasından sorumludur
     * @param contentType doğrulanmış MIME tipi
     * @param size        bayt cinsinden uzunluk
     */
    void put(String key, String contentType, long size, InputStream content);

    /** Nesneyi okur; yoksa boş. */
    Optional<StoredObject> get(String key);

    /** Nesneyi siler. Yoksa sessizce geçer. */
    void delete(String key);

    /** İçerik akışı ve indirme için gereken üstbilgiler. */
    record StoredObject(InputStream content, String contentType, long size) {}
}
