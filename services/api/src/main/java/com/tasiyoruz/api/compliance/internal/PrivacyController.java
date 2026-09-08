package com.tasiyoruz.api.compliance.internal;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * İlgili kişi başvuruları (KVKK).
 *
 * <p>Başvuru kaydediliyor, otomatik uygulanmıyor: "verilerimi sil" dendiğinde her
 * şeyi silmek yanlış olur — mevzuat gereği saklanması gereken kayıtlar var ve
 * hangisinin ne kadar tutulacağı hukuki bir karar (docs/14).
 */
@RestController
@RequestMapping("/api/v1/privacy/requests")
@Tag(name = "Gizlilik başvuruları")
class PrivacyController {

    private final DataRequestService requests;

    PrivacyController(DataRequestService requests) {
        this.requests = requests;
    }

    @GetMapping
    List<RequestView> mine(@AuthenticationPrincipal Jwt jwt) {
        return requests.mine(jwt.getSubject()).stream()
                .map(r -> new RequestView(r.getId().toString(), r.getRequestType(), r.getStatus(),
                        r.getCreatedAt(), r.getResponse()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Erişim, düzeltme, silme ya da bilgi talebi oluştur")
    RequestView submit(@AuthenticationPrincipal Jwt jwt, @RequestBody SubmitRequest body) {
        var saved = requests.submit(jwt.getSubject(), body.requestType(), body.detail());
        return new RequestView(saved.getId().toString(), saved.getRequestType(), saved.getStatus(),
                saved.getCreatedAt(), null);
    }

    record SubmitRequest(@NotBlank String requestType, @Size(max = 2000) String detail) {}

    record RequestView(String id, String requestType, String status, Instant createdAt, String response) {}
}
