package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.tracking.api.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Araç sahibi: işlerim, aşama ilerlet, teslim kanıtı. ROLE_DRIVER (SecurityConfig). */
@RestController
@RequestMapping("/api/v1/driver/trips")
@Tag(name = "İşler (araç sahibi)")
class DriverTripController {

    private final TripService trips;
    DriverTripController(TripService trips) { this.trips = trips; }

    @GetMapping
    List<TripView> mine(@AuthenticationPrincipal Jwt jwt) { return trips.tripsOfCarrier(jwt.getSubject()); }

    @GetMapping("/{id}")
    TripView one(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return trips.trip(jwt.getSubject(), id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "İş bulunamadı."));
    }

    @PostMapping("/{id}/advance")
    @Operation(summary = "Bir sonraki aşamaya geç; gövdede beklenen aşama verilirse eskimiş istemci 409 alır")
    TripView advance(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody(required = false) AdvanceRequest body) {
        return trips.advance(jwt.getSubject(), id, body == null ? null : body.stage());
    }

    @PostMapping("/{id}/proof-of-delivery")
    @Operation(summary = "Teslim kanıtı → DELIVERED")
    TripView deliver(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @Valid @RequestBody ProofOfDeliveryRequest pod) {
        return trips.deliver(jwt.getSubject(), id, pod);
    }

    @PostMapping(path = "/{id}/photos/{kind}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Taşıma fotoğrafı yükle (yükleme, teslim, hasar)")
    TripView addPhoto(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
                      @PathVariable TripPhotoKind kind, @RequestParam("file") MultipartFile file) {
        return trips.addPhoto(jwt.getSubject(), id, kind, toUploadedPhoto(file));
    }

    @DeleteMapping("/{id}/photos/{photoId}")
    TripView deletePhoto(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @PathVariable String photoId) {
        return trips.deletePhoto(jwt.getSubject(), id, photoId);
    }

    @GetMapping("/{id}/photos/{photoId}/file")
    ResponseEntity<InputStreamResource> photo(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
                                              @PathVariable String photoId) {
        return TripPhotoResponse.of(trips.downloadPhoto(jwt.getSubject(), id, photoId));
    }

    static TripService.UploadedPhoto toUploadedPhoto(MultipartFile file) {
        try {
            return new TripService.UploadedPhoto(file.getContentType(), file.getSize(), file.getInputStream());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dosya okunamadı.");
        }
    }

    record AdvanceRequest(TripStage stage) {}
}
