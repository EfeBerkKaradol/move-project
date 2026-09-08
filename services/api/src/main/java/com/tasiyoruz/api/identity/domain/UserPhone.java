package com.tasiyoruz.api.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;

/** Doğrulanmış telefon numarası. Kayıt yalnızca doğrulama tamamlandığında oluşur. */
@Entity
@Table(name = "user_phones")
public class UserPhone {

    @Id
    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(nullable = false, length = 32)
    private String phone;

    @Column(name = "verified_at", nullable = false)
    private Instant verifiedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Version
    private int version;

    protected UserPhone() {}

    public UserPhone(String userId, String phone, Instant verifiedAt) {
        this.userId = userId;
        this.phone = phone;
        this.verifiedAt = verifiedAt;
        this.createdAt = verifiedAt;
    }

    /** Numara değiştiğinde aynı satır güncelleniyor; kullanıcı başına tek numara. */
    public void changeTo(String newPhone, Instant verifiedAt) {
        this.phone = newPhone;
        this.verifiedAt = verifiedAt;
    }

    public String userId() { return userId; }
    public String phone() { return phone; }
    public Instant verifiedAt() { return verifiedAt; }
}
