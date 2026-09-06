package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.tracking.api.TripService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** Fotoğraf indirme yanıtı; taşıyıcı ve yük sahibi uçları aynı üstbilgileri kullanıyor. */
final class TripPhotoResponse {

    private TripPhotoResponse() {}

    static ResponseEntity<InputStreamResource> of(TripService.PhotoDownload file) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.size())
                // Yüklenen içerik doğrulanmış değil; aynı origin'de render edilmesi
                // gereksiz bir risk, o yüzden indirtiliyor
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
                .body(new InputStreamResource(file.content()));
    }
}
