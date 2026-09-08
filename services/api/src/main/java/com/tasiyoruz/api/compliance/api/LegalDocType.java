package com.tasiyoruz.api.compliance.api;

/** Hukuki belge türleri; her birinin aynı anda tek bir yürürlükteki sürümü olur. */
public enum LegalDocType {
    USER_TERMS,
    SHIPPER_TERMS,
    CARRIER_TERMS,
    PROHIBITED_ITEMS,
    UNLAWFUL_USE,
    PRIVACY_POLICY,
    KVKK_NOTICE,
    EXPLICIT_CONSENT,
    COOKIE_POLICY,
    COMPLAINTS,
    DISTANCE_CONTRACT,
    CANCELLATION_REFUND,
    COMMERCIAL_MESSAGE
}
