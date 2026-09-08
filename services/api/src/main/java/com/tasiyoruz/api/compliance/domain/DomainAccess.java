package com.tasiyoruz.api.compliance.domain;

import com.tasiyoruz.api.compliance.api.AccountStatus;
import java.time.Instant;

/**
 * Durum geçişlerini yalnızca servis katmanına açar; controller ya da başka bir
 * modül bir olayı doğrudan kapatamaz.
 */
public final class DomainAccess {
    private DomainAccess() {}

    public static void withdraw(ConsentRecord c, Instant now) { c.withdraw(now); }
    public static void startReview(ComplianceEvent e, String reviewer) { e.startReview(reviewer); }
    public static void resolve(ComplianceEvent e, String decision, String note, String by, Instant now) {
        e.resolve(decision, note, by, now);
    }
    public static void review(ComplianceReport r, String status, String note, String by, Instant now) {
        r.review(status, note, by, now);
    }
    public static void handle(DataRequest d, String status, String response, String by, Instant now) {
        d.handle(status, response, by, now);
    }
    public static void change(AccountStatusRecord a, AccountStatus status, String reason,
                              String by, Instant now, Instant until) {
        a.change(status, reason, by, now, until);
    }
}
