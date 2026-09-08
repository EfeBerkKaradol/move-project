package com.tasiyoruz.api.compliance.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Denetim izi satırı — yalnızca eklenir.
 *
 * <p>Bilerek hiçbir değiştirme metodu yok. Detay alanına kişisel veri ya da sır
 * yazılmaz: kim, neyi, ne zaman yaptı yeterli.
 */
@Entity
@Table(name = "audit_log")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class AuditEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(length = 64) private String actorId;
    @Column(length = 32) private String actorRole;
    @Column(nullable = false, length = 64) private String action;
    @Column(length = 32) private String subjectType;
    @Column(length = 64) private String subjectRef;

    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> detail;

    @Column(length = 45) private String ipAddress;
    @Column(nullable = false) private Instant createdAt;

    public static AuditEntry of(String actorId, String actorRole, String action, String subjectType,
                                String subjectRef, Map<String, Object> detail, String ipAddress, Instant now) {
        var a = new AuditEntry();
        a.actorId = actorId;
        a.actorRole = actorRole;
        a.action = action;
        a.subjectType = subjectType;
        a.subjectRef = subjectRef;
        a.detail = detail == null ? Map.of() : Map.copyOf(detail);
        a.ipAddress = ipAddress;
        a.createdAt = now;
        return a;
    }
}
