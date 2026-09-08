package com.tasiyoruz.api.ordering.internal;

import com.tasiyoruz.api.shared.storage.ObjectStorage;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * Fotoğrafı akıtan yanıt.
 *
 * <p>{@code inline}: bu kareler sayfada gösterilecek, indirilmeyecek. Tarayıcının
 * içerik tipini tahmin etmesi kapalı — beyan edilen tip zaten beyaz listeden geçiyor,
 * tahmin etmesine izin vermek o listeyi anlamsız kılardı.
 */
final class ListingPhotoResponse {
    private ListingPhotoResponse() {}

    static ResponseEntity<InputStreamResource> of(ObjectStorage.StoredObject object) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(object.contentType()))
                .contentLength(object.size())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(new InputStreamResource(object.content()));
    }
}
