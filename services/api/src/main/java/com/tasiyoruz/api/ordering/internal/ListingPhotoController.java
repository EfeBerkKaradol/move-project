package com.tasiyoruz.api.ordering.internal;

import com.tasiyoruz.api.ordering.api.ListingPhotoView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Yük fotoğrafları — ilan yayınlanmadan önce.
 *
 * <p>İlana değil kullanıcıya bağlı bir uç: yayın anında ilan henüz yok. Yüklenen kare
 * sahibinden başkasına görünmüyor; ilana iliştirilene kadar hiçbir listede yer almıyor.
 */
@RestController
@RequestMapping("/api/v1/listing-photos")
@Tag(name = "İlanlar (yük veren)")
class ListingPhotoController {

    private final ListingPhotoService photos;

    ListingPhotoController(ListingPhotoService photos) {
        this.photos = photos;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Yük fotoğrafı yükle — dönen kimlik ilan isteğine konur")
    ListingPhotoView upload(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file) {
        try {
            return photos.upload(jwt.getSubject(), file.getContentType(), file.getSize(), file.getInputStream());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dosya okunamadı.");
        }
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Yayınlanmamış fotoğrafı sil")
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        photos.delete(jwt.getSubject(), id);
    }
}
