package com.tasiyoruz.api.compliance.domain;

import com.tasiyoruz.api.compliance.api.AccountStatus;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Hesabın platform üzerindeki durumu ve gerekçesi. */
@Entity
@Table(name = "account_statuses")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class AccountStatusRecord {

    @Id @Column(length = 64) private String userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private AccountStatus status;
    @Column(columnDefinition = "text") private String reason;
    @Column(length = 64) private String changedBy;
    @Column(nullable = false) private Instant changedAt;
    private Instant until;

    public static AccountStatusRecord of(String userId, AccountStatus status, String reason,
                                         String changedBy, Instant now, Instant until) {
        var a = new AccountStatusRecord();
        a.userId = userId;
        a.status = status;
        a.reason = reason;
        a.changedBy = changedBy;
        a.changedAt = now;
        a.until = until;
        return a;
    }

    void change(AccountStatus status, String reason, String changedBy, Instant now, Instant until) {
        this.status = status;
        this.reason = reason;
        this.changedBy = changedBy;
        this.changedAt = now;
        this.until = until;
    }

    /** Süreli kısıtlama dolduysa hesap yeniden işlem yapabilir. */
    public AccountStatus effectiveStatus(Instant now) {
        if (until != null && now.isAfter(until)) return AccountStatus.ACTIVE;
        return status;
    }
}
