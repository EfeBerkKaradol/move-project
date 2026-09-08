package com.tasiyoruz.api.compliance.api;

/** Neyin incelenmek üzere işaretlendiği. */
public enum ComplianceEventType {
    PROHIBITED_ITEM,
    FALSE_DECLARATION,
    SUSPICIOUS_TRANSACTION,
    MULTIPLE_ACCOUNTS,
    IDENTITY_MISMATCH,
    PAYMENT_ABUSE,
    FRAUD_SUSPECTED,
    ILLEGAL_ACTIVITY_SUSPECTED,
    TERMS_VIOLATION,
    USER_REPORT
}
