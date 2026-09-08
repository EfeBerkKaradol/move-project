package com.tasiyoruz.api.compliance.api;

import java.util.Map;

/**
 * Uyum olaylarının açılması.
 *
 * <p>Bu arayüz karar üretmiyor, <strong>inceleme talebi</strong> üretiyor. Sistem
 * "bu kullanıcı suçlu" diyemez; diyebilseydi yanlış pozitif bir kullanıcıyı haksız
 * yere kapatırdı ve kimse gerekçesini göremezdi. Kararı gerekçesiyle birlikte bir
 * insan veriyor.
 */
public interface ComplianceEvents {

    /**
     * Bir olayı incelemeye açar.
     *
     * @param signals kararı doğuran sinyaller; inceleyene gerekçe sunuyor
     *                ("hangi kelime", "kaç bildirim") — sonuç değil, girdi
     */
    void raise(ComplianceEventType type, Severity severity, String userId,
               String subjectRef, String reason, Map<String, Object> signals);

    /** Sinyalsiz kısa yol. */
    default void raise(ComplianceEventType type, Severity severity, String userId,
                       String subjectRef, String reason) {
        raise(type, severity, userId, subjectRef, reason, Map.of());
    }
}
