package com.tasiyoruz.api.compliance.domain;

import com.tasiyoruz.api.compliance.api.LegalDocType;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Hukuki belgenin sürüm kaydı. Metin depoda; burada künye duruyor. */
@Entity
@Table(name = "legal_documents")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class LegalDocument {

    @Id @GeneratedValue private UUID id;
    @Enumerated(EnumType.STRING) @Column(name = "doc_type", nullable = false, length = 48)
    private LegalDocType docType;
    @Column(nullable = false, length = 16) private String version;
    @Column(nullable = false, length = 200) private String title;
    @Column(nullable = false, length = 64) private String slug;
    @Column(nullable = false) private Instant effectiveAt;
    private Instant publishedAt;
    @Column(nullable = false) private boolean requiresReacceptance;
    @Column(nullable = false) private boolean active;
    @Column(nullable = false) private Instant createdAt;
}
