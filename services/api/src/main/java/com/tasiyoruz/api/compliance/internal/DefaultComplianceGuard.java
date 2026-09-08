package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.AccountStatus;
import com.tasiyoruz.api.compliance.api.AuditTrail;
import com.tasiyoruz.api.compliance.api.ComplianceGuard;
import com.tasiyoruz.api.compliance.domain.AccountStatusRecord;
import com.tasiyoruz.api.compliance.domain.DomainAccess;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hesap kısıtlamaları.
 *
 * <p>Kaydı olmayan kullanıcı ACTIVE sayılıyor: kısıtlama bir istisna, herkes için
 * satır açmak tabloyu kullanıcı sayısı kadar büyütürdü.
 */
@Service
@Transactional
class DefaultComplianceGuard implements ComplianceGuard {

    private final AccountStatusRepository statuses;
    private final AuditTrail audit;
    private final Clock clock;

    DefaultComplianceGuard(AccountStatusRepository statuses, AuditTrail audit, Clock clock) {
        this.statuses = statuses;
        this.audit = audit;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public AccountStatus statusOf(String userId) {
        return statuses.findById(userId)
                .map(r -> r.effectiveStatus(Instant.now(clock)))
                .orElse(AccountStatus.ACTIVE);
    }

    @Override
    @Transactional(readOnly = true)
    public void requireCanTransact(String userId) {
        var status = statusOf(userId);
        if (status.canTransact()) return;
        // Mesaj gerekçeyi taşımıyor: inceleme sürecinin ayrıntısı kullanıcıya
        // buradan değil, itiraz kanalından açıklanıyor.
        throw ComplianceExceptions.forbidden(switch (status) {
            case RESTRICTED -> "Hesabın şu an yeni işlem açamıyor. Destek ekibiyle iletişime geçebilirsin.";
            case SUSPENDED -> "Hesabın inceleme nedeniyle geçici olarak durduruldu.";
            case BANNED -> "Hesabın kapatıldı.";
            case ACTIVE -> "";
        });
    }

    /** Yönetim tarafı: durumu gerekçesiyle değiştirir. */
    AccountStatus change(String userId, AccountStatus status, String reason, String changedBy, Instant until) {
        if (reason == null || reason.isBlank()) {
            // Gerekçesiz kısıtlama, itiraz edilemez bir kısıtlamadır
            throw ComplianceExceptions.badRequest("Gerekçe zorunlu.");
        }
        var now = Instant.now(clock);
        var record = statuses.findById(userId).orElse(null);
        if (record == null) {
            record = AccountStatusRecord.of(userId, status, reason, changedBy, now, until);
        } else {
            DomainAccess.change(record, status, reason, changedBy, now, until);
        }
        statuses.save(record);
        audit.record(changedBy, "COMPLIANCE", "ACCOUNT_STATUS_CHANGED", "user", userId,
                Map.of("status", status.name(), "reason", reason));
        return status;
    }

    @Transactional(readOnly = true)
    List<AccountStatusRecord> restricted() {
        return statuses.findByStatusInOrderByChangedAtDesc(
                List.of(AccountStatus.RESTRICTED, AccountStatus.SUSPENDED, AccountStatus.BANNED));
    }
}
