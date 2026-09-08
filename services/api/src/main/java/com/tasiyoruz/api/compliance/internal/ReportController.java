package com.tasiyoruz.api.compliance.internal;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/** Kullanıcının ihlal bildirimi. */
@RestController
@RequestMapping("/api/v1/reports")
@Tag(name = "İhlal bildirimi")
class ReportController {

    private final ReportService reports;

    ReportController(ReportService reports) {
        this.reports = reports;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Şüpheli ya da yasaklı kullanım bildir")
    ReportCreated submit(@AuthenticationPrincipal Jwt jwt, @RequestBody SubmitReport request) {
        var saved = reports.submit(jwt.getSubject(), request.reportedUserId(), request.subjectRef(),
                request.category(), request.description());
        return new ReportCreated(saved.getId().toString(), saved.getStatus());
    }

    record SubmitReport(
            @NotBlank String category,
            String subjectRef,
            String reportedUserId,
            @Size(max = 2000) String description) {}

    record ReportCreated(String id, String status) {}
}
