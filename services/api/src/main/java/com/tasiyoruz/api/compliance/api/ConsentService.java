package com.tasiyoruz.api.compliance.api;

import java.util.List;
import java.util.Optional;

/**
 * Rıza ve kabullerin kaydı.
 *
 * <p>Kayıt <strong>eklenerek</strong> tutuluyor, güncellenerek değil: bir rızanın
 * ne zaman verildiği ve ne zaman geri çekildiği ayrı satırlar. Üzerine yazılan bir
 * rıza kaydı, "o tarihte izin var mıydı?" sorusunu cevaplayamaz.
 */
public interface ConsentService {

    /** Kaydı yazar ve denetim izine düşer. */
    ConsentView record(String userId, RecordConsent consent);

    /** Kullanıcının bir türdeki en son kaydı. */
    Optional<ConsentView> latest(String userId, ConsentType type);

    /** Şu an geçerli bir kabul var mı (verilmiş ve geri çekilmemiş). */
    boolean isActive(String userId, ConsentType type);

    /**
     * Yürürlükteki sürüm kabul edilmiş mi?
     *
     * <p>Sürüm karşılaştırması şart: eski sürümü kabul etmiş kullanıcı, esaslı
     * değişiklik sonrası yeniden kabul akışına girmeli.
     */
    boolean hasAcceptedCurrent(String userId, LegalDocType docType);

    /** Geri çekilebilir bir rızayı geri çeker. */
    void withdraw(String userId, ConsentType type);

    List<ConsentView> historyOf(String userId);

    /** Bir işleme bağlı beyanlar (ilan kimliği gibi). */
    List<ConsentView> forSubject(String subjectRef);
}
