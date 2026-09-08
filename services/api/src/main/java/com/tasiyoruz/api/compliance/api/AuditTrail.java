package com.tasiyoruz.api.compliance.api;

import java.util.Map;

/**
 * Denetim izi — yalnızca eklenir.
 *
 * <p>Güncellenebilir bir denetim izi denetim izi değildir: uyumun anlamı, geriye
 * dönük düzeltilemeyen bir kayıttır. Bu yüzden arayüzde ne güncelleme ne silme var.
 *
 * <p>Buraya kişisel veri ya da sır YAZILMAZ — kim, neyi, ne zaman yaptı yeterli.
 * Detay alanına yükün içeriği, telefon numarası ya da belge içeriği konmaz.
 */
public interface AuditTrail {

    void record(String actorId, String actorRole, String action,
                String subjectType, String subjectRef, Map<String, Object> detail);

    default void record(String actorId, String action, String subjectType, String subjectRef) {
        record(actorId, null, action, subjectType, subjectRef, Map.of());
    }
}
