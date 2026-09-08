package com.tasiyoruz.api.compliance.api;

import java.time.Instant;
import java.util.Map;

/** Uyum olayının yönetim ekranındaki görünümü. */
public record ComplianceEventView(
        String id,
        String userId,
        String subjectRef,
        ComplianceEventType eventType,
        Severity severity,
        String reason,
        Map<String, Object> signals,
        String status,
        String decision,
        String decisionNote,
        Instant createdAt,
        Instant resolvedAt,
        String resolvedBy) {}
