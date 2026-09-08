package com.tasiyoruz.api;

import com.tasiyoruz.api.ordering.api.CreateListingRequest;
import com.tasiyoruz.api.ordering.api.ListingPhotos;
import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.stream.IntStream;
import org.springframework.stereotype.Component;

/**
 * Geçerli bir ilan isteğinin zorunlu parçaları.
 *
 * <p>Beyan ve fotoğraf artık ilanın olmazsa olmazı; her testin bunları elde kurması
 * gürültü olurdu. Fotoğraf gerçekten depoya yazılıyor — sahte bir kimlik üretilseydi
 * iliştirme yolunun sahiplik ve varlık kontrolleri hiç çalışmazdı.
 */
@Component
public class ListingFixture {

    private final ListingPhotos photos;

    ListingFixture(ListingPhotos photos) {
        this.photos = photos;
    }

    /** Tek kareyle yayınlamaya yetecek fotoğraf kimlikleri. */
    public List<String> photoIds(String ownerId) {
        return photoIds(ownerId, 1);
    }

    public List<String> photoIds(String ownerId, int count) {
        return IntStream.range(0, count).mapToObj(i -> upload(ownerId)).toList();
    }

    /** Tipik ev taşıması beyanı: bir buzdolabı ve sekiz koli. */
    public List<CreateListingRequest.ItemLine> items() {
        return List.of(new CreateListingRequest.ItemLine("BUZDOLABI_NOFROST", 1),
                new CreateListingRequest.ItemLine("KOLI_STANDART", 8));
    }

    private String upload(String ownerId) {
        var bytes = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9};
        return photos.upload(ownerId, "image/jpeg", bytes.length, new ByteArrayInputStream(bytes)).id();
    }
}
