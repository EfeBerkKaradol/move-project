package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Kullanıcının rızaları ve kabulleri.
 *
 * <p>Kayıt Keycloak'ta yapıldığı için sözleşme kabulü kayıt formunda alınamıyor.
 * Bunun yerine ilk girişte bir onay kapısı var: {@code /pending} boş dönene kadar
 * web arayüzü kullanıcıyı panele bırakmıyor. Aynı mekanizma sürüm değiştiğinde
 * yeniden kabulü de sağlıyor — ayrı bir akış yazmaya gerek kalmıyor.
 */
@RestController
@RequestMapping("/api/v1/consents")
@Tag(name = "Rıza ve kabuller")
class ConsentController {

    private final ConsentService consents;
    private final LegalDocuments documents;

    ConsentController(ConsentService consents, LegalDocuments documents) {
        this.consents = consents;
        this.documents = documents;
    }

    @GetMapping("/pending")
    @Operation(summary = "Kabul edilmesi gereken ama edilmemiş belgeler")
    List<LegalDocumentView> pending(@AuthenticationPrincipal Jwt jwt) {
        return documents.pendingFor(jwt.getSubject(), isCarrier(jwt));
    }

    /**
     * Bekleyen belgeleri kabul eder.
     *
     * <p>Hangi belgelerin kabul edildiği istemciden alınmıyor: sunucu bekleyenleri
     * kendisi buluyor. İstemci listesine güvenmek, kullanıcının yalnızca bir belgeyi
     * kabul edip diğerini atlamasına izin verirdi.
     */
    @PostMapping("/accept")
    @Operation(summary = "Bekleyen sözleşmeleri kabul et")
    List<ConsentView> accept(@AuthenticationPrincipal Jwt jwt, @RequestBody AcceptRequest request) {
        var userId = jwt.getSubject();
        var pending = documents.pendingFor(userId, isCarrier(jwt));
        if (pending.isEmpty()) return List.of();
        if (!Boolean.TRUE.equals(request.accepted())) {
            throw ComplianceExceptions.badRequest("Devam edebilmek için sözleşmeleri kabul etmen gerekiyor.");
        }

        var recorded = pending.stream()
                .map(d -> consents.record(userId, new RecordConsent(ConsentType.TERMS_ACCEPTED,
                        d.docType(), d.version(), true, "CONSENT_GATE", null)))
                .toList();

        // Aydınlatma bir kabul değil bir bilgilendirme; ayrı kayda giriyor ki
        // "rıza aldık" ile "bilgilendirdik" birbirine karışmasın
        if (Boolean.TRUE.equals(request.noticeSeen())) {
            consents.record(userId, new RecordConsent(ConsentType.KVKK_NOTICE_SEEN,
                    LegalDocType.KVKK_NOTICE, null, true, "CONSENT_GATE", null));
        }
        return recorded;
    }

    @GetMapping("/me")
    List<ConsentView> mine(@AuthenticationPrincipal Jwt jwt) {
        return consents.historyOf(jwt.getSubject());
    }

    @GetMapping("/preferences")
    @Operation(summary = "Pazarlama ve çerez tercihleri")
    Map<String, Boolean> preferences(@AuthenticationPrincipal Jwt jwt) {
        var userId = jwt.getSubject();
        return Map.of(
                "marketingEmail", consents.isActive(userId, ConsentType.MARKETING_EMAIL),
                "marketingSms", consents.isActive(userId, ConsentType.MARKETING_SMS));
    }

    /**
     * Ticari ileti izni. Zorunlu değil ve her an kapatılabilir; kapatma da bir
     * kayıt üretiyor.
     */
    @PutMapping("/preferences/{type}")
    void setPreference(@AuthenticationPrincipal Jwt jwt, @PathVariable ConsentType type,
                       @RequestBody PreferenceRequest request) {
        if (!type.isWithdrawable()) throw ComplianceExceptions.badRequest("Bu tercih buradan değiştirilemez.");
        var userId = jwt.getSubject();
        if (Boolean.TRUE.equals(request.enabled())) {
            consents.record(userId, RecordConsent.accepted(type, "ACCOUNT_SETTINGS"));
        } else {
            consents.withdraw(userId, type);
        }
    }

    private static boolean isCarrier(Jwt jwt) {
        var realm = jwt.getClaimAsMap("realm_access");
        if (realm == null) return false;
        var roles = realm.get("roles");
        return roles instanceof List<?> list && list.contains("DRIVER");
    }

    record AcceptRequest(@NotNull Boolean accepted, Boolean noticeSeen) {}

    record PreferenceRequest(@NotNull Boolean enabled) {}
}
