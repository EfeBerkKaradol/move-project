package com.tasiyoruz.api.ordering.api;

import java.io.InputStream;

/**
 * Yük fotoğraflarının yüklenmesi.
 *
 * <p>İlandan ayrı bir arayüz çünkü akış tersten işliyor: kareler ilan var olmadan
 * önce yükleniyor, yayın anında iliştiriliyor. İliştirme {@link MarketplaceService}
 * içinde, yayının bir parçası olarak yapılıyor — dışarıdan çağrılabilir olsaydı
 * beyansız ilan ile fotoğraf arasındaki bağ kopabilirdi.
 */
public interface ListingPhotos {

    /**
     * Kareyi depoya yazar ve sahibine bağlar. Yalnızca fotoğraf kabul edilir.
     *
     * @return ilan isteğine konulacak kimlik
     */
    ListingPhotoView upload(String ownerId, String contentType, long size, InputStream content);

    /** Yayınlanmamış kareyi siler. Yayınlanmış bir ilanın karesi silinemez. */
    void delete(String ownerId, String photoId);
}
