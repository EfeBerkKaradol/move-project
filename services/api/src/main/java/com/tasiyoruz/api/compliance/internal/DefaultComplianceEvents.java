package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.*;
import com.tasiyoruz.api.compliance.domain.ComplianceEvent;
import com.tasiyoruz.api.compliance.domain.DomainAccess;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Uyum olayları.
 *
 * <p>Olay açmak bir suçlama değil, bir sıraya koyma. Karar — ve gerekçesi —
 * insandan geliyor; sistem yalnızca "buraya bakılsın" diyor.
 */
@Service
@Transactional
class DefaultComplianceEvents implements ComplianceEvents {

    private static final List<String> OPEN_STATUSES = List.of("OPEN", "UNDER_REVIEW");

    private final ComplianceEventRepository events;
    private final DefaultComplianceGuard guard;
    private final AuditTrail audit;
    private final Clock clock;

    DefaultComplianceEvents(ComplianceEventRepository events, DefaultComplianceGuard guard,
                            AuditTrail audit, Clock clock) {
        this.events = events;
        this.guard = guard;
        this.audit = audit;
        this.clock = clock;
    }

    @Override
    public void raise(ComplianceEventType type, Severity severity, String userId,
                      String subjectRef, String reason, Map<String, Object> signals) {
        var saved = events.save(ComplianceEvent.open(type, severity, userId, subjectRef, reason,
                signals, Instant.now(clock)));
        audit.record(null, "SYSTEM", "COMPLIANCE_EVENT_RAISED", "compliance_event", saved.getId().toString(),
                Map.of("type", type.name(), "severity", severity.name()));
    }

    @Transactional(readOnly = true)
    List<ComplianceEvent> open() {
        return events.findByStatusInOrderBySeverityDescCreatedAtDesc(OPEN_STATUSES);
    }

    @Transactional(readOnly = true)
    long openCount() {
        return events.countByStatusIn(OPEN_STATUSES);
    }

    ComplianceEvent startReview(String id, String reviewer) {
        var event = events.findById(uuid(id)).orElseThrow(() -> ComplianceExceptions.notFound("Olay"));
        if (!event.isOpen()) throw ComplianceExceptions.conflict("Bu olay kapanmış.");
        DomainAccess.startReview(event, reviewer);
        audit.record(reviewer, "COMPLIANCE", "COMPLIANCE_REVIEW_STARTED", "compliance_event", id, Map.of());
        return events.save(event);
    }

    /**
     * Kararı yazar ve gerekiyorsa hesabı kısıtlar.
     *
     * <p>Gerekçe zorunlu: bir hesabın neden kapatıldığı, kapatan kişi ayrıldıktan
     * sonra da okunabilmeli.
     */
    ComplianceEvent decide(String id, String decision, String note, String reviewer) {
        if (note == null || note.isBlank()) throw ComplianceExceptions.badRequest("Karar gerekçesi zorunlu.");
        var event = events.findById(uuid(id)).orElseThrow(() -> ComplianceExceptions.notFound("Olay"));
        if (!event.isOpen()) throw ComplianceExceptions.conflict("Bu olay zaten sonuçlandırılmış.");

        var now = Instant.now(clock);
        DomainAccess.resolve(event, decision, note, reviewer, now);
        events.save(event);

        if (event.getUserId() != null) {
            var status = switch (decision) {
                case "RESTRICT" -> AccountStatus.RESTRICTED;
                case "SUSPEND" -> AccountStatus.SUSPENDED;
                case "BAN" -> AccountStatus.BANNED;
                default -> AccountStatus.ACTIVE;
            };
            guard.change(event.getUserId(), status, note, reviewer, null);
        }

        audit.record(reviewer, "COMPLIANCE", "COMPLIANCE_DECIDED", "compliance_event", id,
                Map.of("decision", decision));
        return event;
    }

    @Transactional(readOnly = true)
    List<ComplianceEvent> forUser(String userId) {
        return events.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /** Risk motorunun girdisi: kullanıcının yakın geçmişteki olay sayısı. */
    @Transactional(readOnly = true)
    long recentEventCount(String userId, Instant since) {
        return events.countByUserIdAndCreatedAtAfter(userId, since);
    }

    static ComplianceEventView view(ComplianceEvent e) {
        return new ComplianceEventView(e.getId().toString(), e.getUserId(), e.getSubjectRef(),
                e.getEventType(), e.getSeverity(), e.getReason(), e.getSignals(), e.getStatus(),
                e.getDecision(), e.getDecisionNote(), e.getCreatedAt(), e.getResolvedAt(), e.getResolvedBy());
    }

    private static java.util.UUID uuid(String raw) {
        try {
            return java.util.UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            throw ComplianceExceptions.notFound("Kayıt");
        }
    }
}
