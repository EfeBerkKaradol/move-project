package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.AuditTrail;
import com.tasiyoruz.api.compliance.domain.AuditEntry;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Denetim izi — yalnızca ekleyen bir servis; güncelleme ve silme yok. */
@Service
@Transactional
class DefaultAuditTrail implements AuditTrail {

    private final AuditEntryRepository entries;
    private final ClientContextResolver client;
    private final Clock clock;

    DefaultAuditTrail(AuditEntryRepository entries, ClientContextResolver client, Clock clock) {
        this.entries = entries;
        this.client = client;
        this.clock = clock;
    }

    @Override
    public void record(String actorId, String actorRole, String action,
                       String subjectType, String subjectRef, Map<String, Object> detail) {
        entries.save(AuditEntry.of(actorId, actorRole, action, subjectType, subjectRef,
                detail, client.ipAddress(), Instant.now(clock)));
    }

    @Transactional(readOnly = true)
    List<AuditEntry> recent(int limit) {
        return entries.findAllByOrderByCreatedAtDesc(Limit.of(limit));
    }

    @Transactional(readOnly = true)
    List<AuditEntry> forSubject(String subjectType, String subjectRef) {
        return entries.findBySubjectTypeAndSubjectRefOrderByCreatedAtDesc(subjectType, subjectRef);
    }
}
