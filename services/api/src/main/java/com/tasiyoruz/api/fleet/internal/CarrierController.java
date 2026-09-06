package com.tasiyoruz.api.fleet.internal;

import com.tasiyoruz.api.fleet.api.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.IOException;
import java.time.LocalDate;
import org.springframework.core.io.InputStreamResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Taşıyıcı adayının kendi başvurusu ve belgeleri.
 *
 * <p>Yol bilerek {@code /driver} altında değil: kayıt olan herkes yük veren olarak
 * başlıyor, DRIVER rolünü ancak başvurusu onaylandıktan sonra alıyor. Uçlar
 * {@code /driver/**} altında olsaydı başvurmak için zaten taşıyıcı olmak gerekirdi.
 * Kimlik doğrulaması yeterli; her istek yalnızca kendi başvurusuna erişiyor.
 */
@RestController
@RequestMapping("/api/v1/carrier/profile")
@Tag(name = "Taşıyıcı başvurusu ve belgeler")
class CarrierController {

    private final CarrierService carriers;

    CarrierController(CarrierService carriers) {
        this.carriers = carriers;
    }

    @GetMapping
    @Operation(summary = "Başvurum ve belgelerim")
    ResponseEntity<CarrierProfileView> mine(@AuthenticationPrincipal Jwt jwt) {
        return carriers.profileOf(jwt.getSubject())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping
    @Operation(summary = "Başvuru bilgilerini kaydet")
    CarrierProfileView apply(@AuthenticationPrincipal Jwt jwt,
                             @Valid @RequestBody CarrierApplicationRequest request) {
        return carriers.apply(jwt.getSubject(), request);
    }

    @PostMapping(path = "/documents/{kind}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Belge yükle; aynı türden ikinci yükleme öncekinin üzerine yazar")
    CarrierProfileView upload(@AuthenticationPrincipal Jwt jwt,
                              @PathVariable DocumentKind kind,
                              @RequestParam("file") MultipartFile file,
                              @RequestParam(required = false)
                              @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiresOn) {
        return carriers.uploadDocument(jwt.getSubject(), kind, expiresOn, toUploadedFile(file));
    }

    @DeleteMapping("/documents/{id}")
    CarrierProfileView delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return carriers.deleteDocument(jwt.getSubject(), id);
    }

    @PostMapping("/submit")
    @Operation(summary = "Başvuruyu incelemeye gönder")
    CarrierProfileView submit(@AuthenticationPrincipal Jwt jwt) {
        return carriers.submitForReview(jwt.getSubject());
    }

    @GetMapping("/documents/{id}/file")
    @Operation(summary = "Belge dosyasını indir")
    ResponseEntity<InputStreamResource> download(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        var file = carriers.download(jwt.getSubject(), false, id);
        return fileResponse(file);
    }

    /** Operasyon ve taşıyıcı indirmesi aynı üstbilgileri kullanıyor. */
    static ResponseEntity<InputStreamResource> fileResponse(CarrierService.DocumentDownload file) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.size())
                // Tarayıcıda açmak yerine indirtiyoruz: yüklenen içerik doğrulanmış değil,
                // aynı origin'de render edilmesi gereksiz bir risk
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
                .body(new InputStreamResource(file.content()));
    }

    private static UploadedFile toUploadedFile(MultipartFile file) {
        try {
            return new UploadedFile(file.getOriginalFilename(), file.getContentType(),
                    file.getSize(), file.getInputStream());
        } catch (IOException e) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Dosya okunamadı.");
        }
    }
}
