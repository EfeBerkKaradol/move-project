package com.tasiyoruz.api.compliance.api;

/**
 * Bir rıza/kabul kaydı isteği.
 *
 * <p>IP ve tarayıcı bilgisi burada YOK: isteğin içinden okunuyor (bkz.
 * {@code ClientContextResolver}). Çağıran her yere bu ikisini elle taşıtmak,
 * bir yerde unutulduğunda ispatı sessizce zayıflatırdı.
 *
 * @param source     rızanın alındığı yer — CONSENT_GATE, LISTING_CREATE,
 *                   CARRIER_ONBOARDING, ACCOUNT_SETTINGS, COOKIE_BANNER
 * @param subjectRef işlem bazlı beyanlarda ilgili kaydın kimliği (ilan gibi)
 */
public record RecordConsent(
        ConsentType consentType,
        LegalDocType docType,
        String docVersion,
        boolean accepted,
        String source,
        String subjectRef) {

    public static RecordConsent accepted(ConsentType type, String source) {
        return new RecordConsent(type, null, null, true, source, null);
    }

    public static RecordConsent declaration(ConsentType type, String source, String subjectRef,
                                            LegalDocType docType, String docVersion) {
        return new RecordConsent(type, docType, docVersion, true, source, subjectRef);
    }
}
