package com.tasiyoruz.api.compliance.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Kullanıcıdan gelen ihlal bildirimi. */
@Entity
@Table(name = "compliance_reports")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class ComplianceReport {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, length = 64) private String reporterId;
    @Column(length = 64) private String reportedUserId;
    @Column(length = 64) private String subjectRef;
    @Column(nullable = false, length = 40) private String category;
    @Column(columnDefinition = "text") private String description;
    @Column(nullable = false, length = 16) private String status;
    @Column(nullable = false) private Instant createdAt;
    private Instant reviewedAt;
    @Column(length = 64) private String reviewedBy;
    @Column(columnDefinition = "text") private String reviewNote;

    public static ComplianceReport of(String reporterId, String reportedUserId, String subjectRef,
                                      String category, String description, Instant now) {
        var r = new ComplianceReport();
        r.reporterId = reporterId;
        r.reportedUserId = reportedUserId;
        r.subjectRef = subjectRef;
        r.category = category;
        r.description = description;
        r.status = "OPEN";
        r.createdAt = now;
        return r;
    }

    void review(String status, String note, String reviewer, Instant now) {
        this.status = status;
        this.reviewNote = note;
        this.reviewedBy = reviewer;
        this.reviewedAt = now;
    }
}
