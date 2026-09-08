package com.tasiyoruz.api.compliance.api;

/**
 * Rıza ve kabul türleri.
 *
 * <p>Aydınlatma ile açık rıza AYRI türler: KVKK'da aydınlatma bir bilgilendirme
 * yükümlülüğü, açık rıza ise bir işleme dayanağı. İkisini tek onay kutusunda
 * birleştirmek rızayı sakatlar, o yüzden veri modelinde de birleşmiyorlar.
 */
public enum ConsentType {
    /** Kullanıcı/gönderici/taşıyıcı sözleşmesinin kabulü. */
    TERMS_ACCEPTED,
    /** Aydınlatma metninin gösterildiğinin kaydı — rıza değil, bilgilendirme. */
    KVKK_NOTICE_SEEN,
    /** Açık rıza gerektiren işlemeler için. Geri çekilebilir. */
    EXPLICIT_CONSENT,
    /** Ticari elektronik ileti izni. Zorunlu değil, geri çekilebilir. */
    MARKETING_EMAIL,
    MARKETING_SMS,
    /** Çerez tercihleri. */
    COOKIE_PREFERENCES,
    /** İşlem bazlı beyan: ilan yayınlarken göndericinin eşya beyanı. */
    SHIPPER_DECLARATION,
    /** İşlem bazlı beyan: taşıyıcının mevzuata uygunluk taahhüdü. */
    CARRIER_DECLARATION;

    /**
     * Geri çekilebilir mi?
     *
     * <p>Sözleşme kabulü geri çekilmez — sözleşmeden çekilmenin karşılığı hesabın
     * kapatılmasıdır, tek bir kaydın silinmesi değil. Pazarlama izni ise her an
     * geri alınabilir olmak zorunda.
     */
    public boolean isWithdrawable() {
        return this == EXPLICIT_CONSENT || this == MARKETING_EMAIL
                || this == MARKETING_SMS || this == COOKIE_PREFERENCES;
    }
}
