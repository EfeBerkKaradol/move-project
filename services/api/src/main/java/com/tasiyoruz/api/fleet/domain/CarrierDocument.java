package com.tasiyoruz.api.fleet.domain;

import com.tasiyoruz.api.fleet.api.DocumentKind;
import com.tasiyoruz.api.fleet.api.DocumentStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Yüklenmiş belge kaydı. Dosyanın kendisi nesne deposunda; burada anahtarı duruyor. */
@Entity
@Table(name = "carrier_documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CarrierDocument {

    @Id @GeneratedValue private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carrier_profile_id", nullable = false)
    private CarrierProfile profile;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private DocumentKind kind;

    @Column(nullable = false, length = 255) private String storageKey;
    @Column(nullable = false, length = 80) private String contentType;
    @Column(nullable = false) private long sizeBytes;
    @Column(length = 255) private String originalFilename;
    private LocalDate expiresOn;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private DocumentStatus status;

    @Column(columnDefinition = "text") private String rejectionReason;
    @Column(nullable = false) private Instant uploadedAt;
    private Instant reviewedAt;

    public static CarrierDocument uploaded(DocumentKind kind, String storageKey, String contentType,
                                           long sizeBytes, String originalFilename, LocalDate expiresOn,
                                           Instant now) {
        var d = new CarrierDocument();
        d.kind = kind;
        d.replaceFile(storageKey, contentType, sizeBytes, originalFilename, expiresOn, now);
        return d;
    }

    void attachTo(CarrierProfile profile) {
        this.profile = profile;
    }

    /** Yeniden yükleme: onay sıfırlanır, önceki red gerekçesi silinir. */
    void replaceFile(String storageKey, String contentType, long sizeBytes, String originalFilename,
                     LocalDate expiresOn, Instant now) {
        this.storageKey = storageKey;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.originalFilename = originalFilename;
        this.expiresOn = expiresOn;
        this.status = DocumentStatus.PENDING;
        this.rejectionReason = null;
        this.reviewedAt = null;
        this.uploadedAt = now;
    }

    void approve(Instant now) {
        this.status = DocumentStatus.APPROVED;
        this.rejectionReason = null;
        this.reviewedAt = now;
    }

    void reject(String reason, Instant now) {
        this.status = DocumentStatus.REJECTED;
        this.rejectionReason = reason;
        this.reviewedAt = now;
    }

    void expire(Instant now) {
        this.status = DocumentStatus.EXPIRED;
        this.reviewedAt = now;
    }

    /** Onaylı ve süresi dolmamış mı? Zorunlu belge sayımı buna bakıyor. */
    public boolean valid(LocalDate today) {
        return status == DocumentStatus.APPROVED && (expiresOn == null || !expiresOn.isBefore(today));
    }
}
