package com.tasiyoruz.api.finance.domain;

import com.tasiyoruz.api.finance.api.FinanceEnums.LedgerAccount;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Çift taraflı kaydın tek satırı. Bir satır ya borç ya alacaktır.
 *
 * <p>Bu defter platformun iç tutarlılık kaydı; resmî muhasebe hesap planı değil.
 * Resmî muhasebeye aktarım ayrı bir katmanın işi olacak.
 */
@Entity
@Table(name = "ledger_entries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LedgerEntry {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false) private UUID transactionId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private LedgerAccount account;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal debit;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal credit;
    @Column(nullable = false) private Instant createdAt;

    public static LedgerEntry debit(UUID txnId, LedgerAccount account, BigDecimal amount, Instant now) {
        return of(txnId, account, amount, BigDecimal.ZERO, now);
    }

    public static LedgerEntry credit(UUID txnId, LedgerAccount account, BigDecimal amount, Instant now) {
        return of(txnId, account, BigDecimal.ZERO, amount, now);
    }

    private static LedgerEntry of(UUID txnId, LedgerAccount account,
                                  BigDecimal debit, BigDecimal credit, Instant now) {
        var e = new LedgerEntry();
        e.transactionId = txnId;
        e.account = account;
        e.debit = debit;
        e.credit = credit;
        e.createdAt = now;
        return e;
    }
}
