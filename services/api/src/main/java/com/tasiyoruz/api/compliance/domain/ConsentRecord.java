package com.tasiyoruz.api.compliance.domain;

import com.tasiyoruz.api.compliance.api.ConsentType;
import com.tasiyoruz.api.compliance.api.LegalDocType;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Bir rıza ya da kabul.
 *
 * <p>Kayıt eklenerek tutuluyor: geri çekme, satırı silmek ya da güncellemek değil
 * {@code withdrawnAt} damgalamak. "O tarihte izin var mıydı?" sorusunun cevabı
 * ancak böyle korunuyor.
 */
@Entity
@Table(name = "consent_records")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class ConsentRecord {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, length = 64) private String userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 48) private ConsentType consentType;
    @Enumerated(EnumType.STRING) @Column(name = "doc_type", length = 48) private LegalDocType docType;
    @Column(name = "doc_version", length = 16) private String docVersion;
    @Column(nullable = false) private boolean accepted;
    @Column(nullable = false, length = 32) private String source;
    @Column(length = 64) private String subjectRef;
    @Column(length = 45) private String ipAddress;
    @Column(length = 400) private String userAgent;
    @Column(nullable = false) private Instant createdAt;
    private Instant withdrawnAt;

    public static ConsentRecord of(String userId, ConsentType type, LegalDocType docType, String docVersion,
                                   boolean accepted, String source, String subjectRef,
                                   String ipAddress, String userAgent, Instant now) {
        var c = new ConsentRecord();
        c.userId = userId;
        c.consentType = type;
        c.docType = docType;
        c.docVersion = docVersion;
        c.accepted = accepted;
        c.source = source;
        c.subjectRef = subjectRef;
        c.ipAddress = ipAddress;
        c.userAgent = userAgent;
        c.createdAt = now;
        return c;
    }

    public boolean isActive() {
        return accepted && withdrawnAt == null;
    }

    void withdraw(Instant now) {
        this.withdrawnAt = now;
    }
}
