package com.tasiyoruz.api.compliance.internal;

/**
 * Yönetim ekranlarında kişisel verinin maskelenmesi.
 *
 * <p>İnceleme yapan kişinin çoğu zaman numaranın tamamına ihtiyacı yok: "bu iki
 * kayıt aynı kişi mi?" sorusu son dört haneyle de cevaplanıyor. Tam veriyi
 * varsayılan yapmak, her bakışta gereksiz bir ifşa üretiyor.
 */
final class Masking {
    private Masking() {}

    /** +90 5xx xxx xx 34 → +90 5** *** ** 34 */
    static String phone(String value) {
        if (value == null || value.length() < 4) return value;
        var last = value.substring(value.length() - 2);
        var head = value.startsWith("+") ? value.substring(0, Math.min(4, value.length())) : "";
        return head + "*".repeat(Math.max(0, value.length() - head.length() - 2)) + last;
    }

    /** ahmet@example.com → a****@example.com */
    static String email(String value) {
        if (value == null) return null;
        var at = value.indexOf('@');
        if (at <= 1) return value;
        return value.charAt(0) + "*".repeat(at - 1) + value.substring(at);
    }

    /** Keycloak subject gibi kimlikler: baş ve son parça yeter. */
    static String id(String value) {
        if (value == null || value.length() <= 10) return value;
        return value.substring(0, 6) + "…" + value.substring(value.length() - 4);
    }
}
