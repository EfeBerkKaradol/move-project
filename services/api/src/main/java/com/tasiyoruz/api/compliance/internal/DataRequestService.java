package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.AuditTrail;
import com.tasiyoruz.api.compliance.domain.DataRequest;
import com.tasiyoruz.api.compliance.domain.DomainAccess;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * İlgili kişi başvuruları (KVKK).
 *
 * <p>Başvuru bir <strong>talep</strong> olarak kaydediliyor, otomatik olarak
 * uygulanmıyor. "Verilerimi sil" dendiğinde her şeyi silmek yanlış olurdu:
 * mevzuat gereği saklanması gereken kayıtlar var ve hangisinin hangi süre
 * tutulacağı hukuki bir karar (docs/14, saklama süreleri).
 */
@Service
@Transactional
class DataRequestService {

    static final Set<String> TYPES = Set.of("ACCESS", "RECTIFICATION", "ERASURE", "PROCESSING_INFO", "OTHER");

    private static final List<String> OPEN_STATUSES = List.of("OPEN", "IN_PROGRESS");

    private final DataRequestRepository requests;
    private final AuditTrail audit;
    private final Clock clock;

    DataRequestService(DataRequestRepository requests, AuditTrail audit, Clock clock) {
        this.requests = requests;
        this.audit = audit;
        this.clock = clock;
    }

    DataRequest submit(String userId, String type, String detail) {
        if (!TYPES.contains(type)) throw ComplianceExceptions.badRequest("Geçersiz başvuru türü.");
        var saved = requests.save(DataRequest.of(userId, type, detail, Instant.now(clock)));
        audit.record(userId, null, "DATA_REQUEST_SUBMITTED", "data_request", saved.getId().toString(),
                Map.of("type", type));
        return saved;
    }

    @Transactional(readOnly = true)
    List<DataRequest> mine(String userId) {
        return requests.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    List<DataRequest> open() {
        return requests.findByStatusInOrderByCreatedAtDesc(OPEN_STATUSES);
    }

    DataRequest handle(String id, String status, String response, String handler) {
        if (!List.of("IN_PROGRESS", "COMPLETED", "REJECTED").contains(status)) {
            throw ComplianceExceptions.badRequest("Geçersiz durum.");
        }
        var request = requests.findById(uuid(id)).orElseThrow(() -> ComplianceExceptions.notFound("Başvuru"));
        DomainAccess.handle(request, status, response, handler, Instant.now(clock));
        audit.record(handler, "COMPLIANCE", "DATA_REQUEST_HANDLED", "data_request", id, Map.of("status", status));
        return requests.save(request);
    }

    private static java.util.UUID uuid(String raw) {
        try {
            return java.util.UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            throw ComplianceExceptions.notFound("Kayıt");
        }
    }
}
