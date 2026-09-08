package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Uyum paneli.
 *
 * <p>Erişim COMPLIANCE ve ADMIN ile sınırlı (SecurityConfig): operasyon ekibi belge
 * onay kuyruğunu yürütüyor, hesap kapatmıyor. Her yazma işlemi denetim izine
 * düşüyor ve gerekçe zorunlu.
 */
@RestController
@RequestMapping("/api/v1/admin/compliance")
@Tag(name = "Uyum yönetimi")
class AdminComplianceController {

    private final DefaultComplianceEvents events;
    private final ReportService reports;
    private final DefaultComplianceGuard guard;
    private final DataRequestService dataRequests;
    private final DefaultAuditTrail audit;
    private final ConsentService consents;

    AdminComplianceController(DefaultComplianceEvents events, ReportService reports,
                              DefaultComplianceGuard guard, DataRequestService dataRequests,
                              DefaultAuditTrail audit, ConsentService consents) {
        this.events = events;
        this.reports = reports;
        this.guard = guard;
        this.dataRequests = dataRequests;
        this.audit = audit;
        this.consents = consents;
    }

    @GetMapping("/overview")
    @Operation(summary = "Açık ihlaller, kısıtlı hesaplar, bekleyen başvurular")
    Overview overview() {
        return new Overview(
                events.openCount(),
                reports.open().size(),
                guard.restricted().size(),
                dataRequests.open().size());
    }

    // ── Uyum olayları ────────────────────────────────────────────────

    @GetMapping("/events")
    List<ComplianceEventView> open() {
        return events.open().stream().map(DefaultComplianceEvents::view).toList();
    }

    @PostMapping("/events/{id}/review")
    @Operation(summary = "İncelemeyi üstlen")
    ComplianceEventView startReview(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return DefaultComplianceEvents.view(events.startReview(id, jwt.getSubject()));
    }

    /**
     * Kararı yazar. Gerekçe zorunlu — gerekçesiz bir kısıtlama, itiraz edilemez
     * bir kısıtlamadır ve kararı veren ayrıldıktan sonra kimse sebebini bilemez.
     */
    @PostMapping("/events/{id}/decide")
    @Operation(summary = "CLEAR / RESTRICT / SUSPEND / BAN")
    ComplianceEventView decide(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
                               @RequestBody Decision body) {
        if (!List.of("CLEAR", "RESTRICT", "SUSPEND", "BAN").contains(body.decision())) {
            throw ComplianceExceptions.badRequest("Geçersiz karar.");
        }
        return DefaultComplianceEvents.view(events.decide(id, body.decision(), body.note(), jwt.getSubject()));
    }

    // ── Bildirimler ──────────────────────────────────────────────────

    @GetMapping("/reports")
    List<ReportRow> reportQueue() {
        return reports.open().stream()
                .map(r -> new ReportRow(r.getId().toString(), r.getCategory(),
                        Masking.id(r.getReporterId()), Masking.id(r.getReportedUserId()),
                        r.getSubjectRef(), r.getDescription(), r.getStatus(), r.getCreatedAt()))
                .toList();
    }

    @PostMapping("/reports/{id}/review")
    void reviewReport(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody Decision body) {
        reports.review(id, body.decision(), body.note(), jwt.getSubject());
    }

    // ── Hesaplar ─────────────────────────────────────────────────────

    @GetMapping("/accounts")
    List<AccountRow> restricted() {
        return guard.restricted().stream()
                .map(a -> new AccountRow(Masking.id(a.getUserId()), a.getStatus(), a.getReason(),
                        a.getChangedAt(), a.getUntil()))
                .toList();
    }

    @PostMapping("/accounts/{userId}/status")
    @Operation(summary = "Hesap durumunu gerekçesiyle değiştir")
    void changeStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable String userId,
                      @RequestBody StatusChange body) {
        guard.change(userId, body.status(), body.reason(), jwt.getSubject(), body.until());
    }

    /** Bir kullanıcının rıza geçmişi — ihtilafta "ne zaman neyi kabul etti" sorusu. */
    @GetMapping("/accounts/{userId}/consents")
    List<ConsentView> consentHistory(@PathVariable String userId) {
        return consents.historyOf(userId);
    }

    // ── KVKK başvuruları ─────────────────────────────────────────────

    @GetMapping("/data-requests")
    List<DataRequestRow> openDataRequests() {
        return dataRequests.open().stream()
                .map(r -> new DataRequestRow(r.getId().toString(), Masking.id(r.getUserId()),
                        r.getRequestType(), r.getStatus(), r.getCreatedAt()))
                .toList();
    }

    @PostMapping("/data-requests/{id}")
    void handleDataRequest(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @RequestBody Decision body) {
        dataRequests.handle(id, body.decision(), body.note(), jwt.getSubject());
    }

    // ── Denetim izi ──────────────────────────────────────────────────

    @GetMapping("/audit")
    List<AuditRow> auditLog() {
        return audit.recent(200).stream()
                .map(a -> new AuditRow(a.getId(), Masking.id(a.getActorId()), a.getActorRole(), a.getAction(),
                        a.getSubjectType(), a.getSubjectRef(), a.getDetail(), a.getCreatedAt()))
                .toList();
    }

    // ── Kayıt tipleri ────────────────────────────────────────────────

    record Overview(long openEvents, long openReports, long restrictedAccounts, long openDataRequests) {}

    record Decision(@NotBlank String decision, String note) {}

    record StatusChange(AccountStatus status, @NotBlank String reason, Instant until) {}

    record ReportRow(String id, String category, String reporter, String reported, String subjectRef,
                     String description, String status, Instant createdAt) {}

    record AccountRow(String userId, AccountStatus status, String reason, Instant changedAt, Instant until) {}

    record DataRequestRow(String id, String userId, String requestType, String status, Instant createdAt) {}

    record AuditRow(Long id, String actor, String actorRole, String action, String subjectType,
                    String subjectRef, Map<String, Object> detail, Instant createdAt) {}
}
