package com.tasiyoruz.api.compliance.api;

import java.util.List;
import java.util.Optional;

/** Yürürlükteki hukuki belgelerin kaydı. */
public interface LegalDocuments {

    List<LegalDocumentView> active();

    Optional<LegalDocumentView> active(LegalDocType docType);

    Optional<LegalDocumentView> bySlug(String slug);

    /**
     * Kullanıcının kabul etmesi gereken ama henüz etmediği belgeler.
     *
     * <p>Boş değilse kullanıcı onay ekranına yönlendiriliyor. Kayıt Keycloak'ta
     * yapıldığı için sözleşme kabulü kayıt formunda alınamıyor; ilk girişte
     * alınıyor ve aynı mekanizma sürüm değişikliğinde yeniden kabulü de sağlıyor.
     */
    List<LegalDocumentView> pendingFor(String userId, boolean carrier);
}
