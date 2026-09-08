package com.tasiyoruz.api.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Açık bir doğrulama denemesi.
 *
 * <p>Kod düz metin tutulmuyor, karması saklanıyor. Deneme sayısı burada sayılıyor:
 * altı haneli bir kod, sınırsız deneme verildiğinde saniyeler içinde bulunur.
 */
@Entity
@Table(name = "phone_verifications")
public class PhoneVerification {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(nullable = false, length = 32)
    private String phone;

    @Column(name = "code_hash", nullable = false, length = 128)
    private String codeHash;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    protected PhoneVerification() {}

    public PhoneVerification(String userId, String phone, String codeHash, Instant now, Instant expiresAt) {
        this.userId = userId;
        this.phone = phone;
        this.codeHash = codeHash;
        this.createdAt = now;
        this.expiresAt = expiresAt;
    }

    public boolean usable(Instant now) {
        return consumedAt == null && now.isBefore(expiresAt);
    }

    public void recordAttempt() { attempts++; }
    public void consume(Instant now) { this.consumedAt = now; }

    public UUID id() { return id; }
    public String phone() { return phone; }
    public String codeHash() { return codeHash; }
    public int attempts() { return attempts; }
    public Instant expiresAt() { return expiresAt; }
}
