package com.tasiyoruz.api.identity.internal;

import com.tasiyoruz.api.identity.api.PhoneView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Kullanıcının kendi telefon numarası.
 *
 * <p>Yol {@code /me} altında: her istek yalnızca isteği yapanın numarasına dokunuyor,
 * kullanıcı kimliği gövdeden değil token'dan geliyor. Gövdeden alınsaydı herhangi biri
 * başkasının numarasını değiştirebilirdi.
 */
@RestController
@RequestMapping("/api/v1/me/phone")
@Tag(name = "Telefon doğrulama")
class PhoneController {

    private final PhoneVerificationService phones;

    PhoneController(PhoneVerificationService phones) {
        this.phones = phones;
    }

    record StartRequest(@NotBlank String phone) {}

    record VerifyRequest(@NotBlank String code) {}

    record StartResponse(String phone, String message) {}

    @GetMapping
    @Operation(summary = "Telefon durumum")
    PhoneView mine(@AuthenticationPrincipal Jwt jwt) {
        return phones.current(jwt.getSubject());
    }

    @PostMapping
    @Operation(summary = "Numaraya doğrulama kodu gönder")
    StartResponse start(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody StartRequest request) {
        var result = phones.start(jwt.getSubject(), request.phone());
        return switch (result.outcome()) {
            case SENT -> new StartResponse(result.phone(), "Doğrulama kodu gönderildi.");
            case INVALID_PHONE -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Geçerli bir Türkiye cep numarası gir (örnek: 0532 123 45 67).");
            case TOO_MANY_REQUESTS -> throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Çok fazla kod istedin. Bir saat sonra tekrar dene.");
            case PHONE_TAKEN -> throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bu numara başka bir hesapta doğrulanmış.");
        };
    }

    @PostMapping("/verify")
    @Operation(summary = "Gelen kodu doğrula")
    PhoneView verify(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody VerifyRequest request) {
        var result = phones.verify(jwt.getSubject(), request.code());
        switch (result) {
            case OK -> { return phones.current(jwt.getSubject()); }
            case NO_PENDING -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Bekleyen bir doğrulama yok. Önce numaranı gir.");
            case EXPIRED -> throw new ResponseStatusException(HttpStatus.GONE,
                    "Kodun süresi doldu. Yeni kod iste.");
            case TOO_MANY_ATTEMPTS -> throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Çok fazla yanlış deneme. Yeni kod iste.");
            case WRONG_CODE -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Kod hatalı.");
            case PHONE_TAKEN -> throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bu numara başka bir hesapta doğrulanmış.");
        }
        throw new IllegalStateException("Beklenmeyen sonuç: " + result);
    }
}
