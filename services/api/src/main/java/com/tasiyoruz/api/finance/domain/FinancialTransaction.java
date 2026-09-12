package com.tasiyoruz.api.finance.domain;

import com.tasiyoruz.api.finance.api.FinanceEnums.TransactionDirection;
import com.tasiyoruz.api.finance.api.FinanceEnums.TransactionStatus;
import com.tasiyoruz.api.finance.api.FinanceEnums.TransactionType;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Değişmez para hareketi.
 *
 * <p>Silme ve tutar düzeltme yok: yanlış kayıt, {@link #reversal} ile ters kayıt
 * üretilerek düzeltilir. Geçmiş olduğu gibi kalır — finansal kayıt sessizce
 * değişmemeli.
 */
@Entity
@Table(name = "financial_transactions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FinancialTransaction {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false) private UUID listingId;
    private UUID tripId;
    @Column(length = 64) private String shipperId;
    @Column(length = 64) private String carrierId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private TransactionType type;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private TransactionDirection direction;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(nullable = false, length = 3) private String currency;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private TransactionStatus status;
    @Column(name = "reverses_transaction_id") private UUID reversesTransactionId;
    @Column(nullable = false) private Instant createdAt;

    public static FinancialTransaction of(UUID listingId, String shipperId, String carrierId,
                                          TransactionType type, TransactionDirection direction,
                                          BigDecimal amount, TransactionStatus status, Instant now) {
        var t = new FinancialTransaction();
        t.listingId = listingId;
        t.shipperId = shipperId;
        t.carrierId = carrierId;
        t.type = type;
        t.direction = direction;
        t.amount = amount;
        t.currency = "TRY";
        t.status = status;
        t.createdAt = now;
        return t;
    }

    /** Hatalı kaydın tersi; tutar aynı, işaret ters ve kaynağa bağlı. */
    public static FinancialTransaction reversal(FinancialTransaction kaynak, Instant now) {
        var t = of(kaynak.listingId, kaynak.shipperId, kaynak.carrierId,
                TransactionType.ADJUSTMENT, kaynak.direction,
                kaynak.amount.negate(), TransactionStatus.SETTLED, now);
        t.reversesTransactionId = kaynak.id;
        return t;
    }
}
