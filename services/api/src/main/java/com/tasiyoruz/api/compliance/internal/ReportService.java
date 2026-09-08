package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.*;
import com.tasiyoruz.api.compliance.domain.ComplianceReport;
import com.tasiyoruz.api.compliance.domain.DomainAccess;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Kullanıcı bildirimleri.
 *
 * <p>Her bildirim ayrıca bir uyum olayı açıyor: bildirimlerin ayrı bir listede
 * birikip kimsenin bakmadığı bir kutuya dönüşmesi, bildirim mekanizmasının en
 * bilinen başarısızlık biçimi. Tek sıra, tek karar noktası.
 */
@Service
@Transactional
class ReportService {

    /** Arayüzdeki kategorilerle birebir; serbest metin kategori kabul edilmiyor. */
    static final Set<String> CATEGORIES = Set.of(
            "PROHIBITED_ITEM", "FALSE_DECLARATION", "FAKE_USER",
            "FRAUD", "HARASSMENT", "OTHER_UNLAWFUL", "OTHER");

    private static final List<String> OPEN_STATUSES = List.of("OPEN", "UNDER_REVIEW");

    private final ComplianceReportRepository reports;
    private final ComplianceEvents events;
    private final AuditTrail audit;
    private final Clock clock;

    ReportService(ComplianceReportRepository reports, ComplianceEvents events, AuditTrail audit, Clock clock) {
        this.reports = reports;
        this.events = events;
        this.audit = audit;
        this.clock = clock;
    }

    ComplianceReport submit(String reporterId, String reportedUserId, String subjectRef,
                            String category, String description) {
        if (!CATEGORIES.contains(category)) throw ComplianceExceptions.badRequest("Geçersiz bildirim kategorisi.");
        if (reports.existsByReporterIdAndSubjectRefAndCategory(reporterId, subjectRef, category)) {
            throw ComplianceExceptions.conflict("Bu bildirimi zaten ilettin; inceleniyor.");
        }

        var saved = reports.save(ComplianceReport.of(reporterId, reportedUserId, subjectRef,
                category, description, Instant.now(clock)));

        events.raise(ComplianceEventType.USER_REPORT,
                "PROHIBITED_ITEM".equals(category) ? Severity.HIGH : Severity.MEDIUM,
                reportedUserId, subjectRef,
                "Kullanıcı bildirimi: " + category,
                Map.of("reportId", saved.getId().toString(), "category", category));

        // Bildiren kişinin kimliği denetim izine yazılmıyor: misilleme riskini
        // gereksiz yere artırır. Bildirimin kendisi zaten kaydında duruyor.
        audit.record(null, "SYSTEM", "REPORT_SUBMITTED", "report", saved.getId().toString(),
                Map.of("category", category));
        return saved;
    }

    @Transactional(readOnly = true)
    List<ComplianceReport> open() {
        return reports.findByStatusInOrderByCreatedAtDesc(OPEN_STATUSES);
    }

    @Transactional(readOnly = true)
    List<ComplianceReport> recent(int limit) {
        return reports.findAllByOrderByCreatedAtDesc(Limit.of(limit));
    }

    ComplianceReport review(String id, String status, String note, String reviewer) {
        if (!List.of("UNDER_REVIEW", "RESOLVED", "DISMISSED").contains(status)) {
            throw ComplianceExceptions.badRequest("Geçersiz durum.");
        }
        var report = reports.findById(uuid(id)).orElseThrow(() -> ComplianceExceptions.notFound("Bildirim"));
        DomainAccess.review(report, status, note, reviewer, Instant.now(clock));
        audit.record(reviewer, "COMPLIANCE", "REPORT_REVIEWED", "report", id, Map.of("status", status));
        return reports.save(report);
    }

    private static java.util.UUID uuid(String raw) {
        try {
            return java.util.UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            throw ComplianceExceptions.notFound("Kayıt");
        }
    }
}
