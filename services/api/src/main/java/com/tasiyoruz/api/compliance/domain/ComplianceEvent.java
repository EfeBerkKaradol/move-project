package com.tasiyoruz.api.compliance.domain;

import com.tasiyoruz.api.compliance.api.ComplianceEventType;
import com.tasiyoruz.api.compliance.api.Severity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * İncelenmek üzere açılmış bir uyum olayı.
 *
 * <p>Kapanışta karar ve gerekçe zorunlu (veritabanı kısıtı da bunu bekliyor):
 * "neden kapatıldı?" sorusu cevapsız kalmamalı — ne kullanıcıya, ne denetime.
 */
@Entity
@Table(name = "compliance_events")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class ComplianceEvent {

    @Id @GeneratedValue private UUID id;
    @Column(length = 64) private String userId;
    @Column(length = 64) private String subjectRef;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40) private ComplianceEventType eventType;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private Severity severity;
    @Column(nullable = false, columnDefinition = "text") private String reason;

    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> signals;

    @Column(nullable = false, length = 16) private String status;
    @Column(length = 16) private String decision;
    @Column(columnDefinition = "text") private String decisionNote;
    @Column(nullable = false) private Instant createdAt;
    private Instant resolvedAt;
    @Column(length = 64) private String resolvedBy;

    public static ComplianceEvent open(ComplianceEventType type, Severity severity, String userId,
                                       String subjectRef, String reason, Map<String, Object> signals, Instant now) {
        var e = new ComplianceEvent();
        e.eventType = type;
        e.severity = severity;
        e.userId = userId;
        e.subjectRef = subjectRef;
        e.reason = reason;
        e.signals = signals == null ? Map.of() : Map.copyOf(signals);
        e.status = "OPEN";
        e.createdAt = now;
        return e;
    }

    void startReview(String reviewer) {
        this.status = "UNDER_REVIEW";
        this.resolvedBy = reviewer;
    }

    void resolve(String decision, String note, String reviewer, Instant now) {
        this.status = "CLEAR".equals(decision) ? "DISMISSED" : "RESOLVED";
        this.decision = decision;
        this.decisionNote = note;
        this.resolvedBy = reviewer;
        this.resolvedAt = now;
    }

    public boolean isOpen() {
        return "OPEN".equals(status) || "UNDER_REVIEW".equals(status);
    }
}
