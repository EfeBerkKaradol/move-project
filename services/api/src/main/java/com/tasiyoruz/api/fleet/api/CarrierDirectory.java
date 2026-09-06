package com.tasiyoruz.api.fleet.api;

import java.util.Optional;

/**
 * Taşıyıcı doğrulamasının diğer modüllere açılan dar yüzü.
 *
 * <p>Pazar yeri ve koridor modülleri başvuru akışının tamamını değil yalnızca şu iki
 * soruyu bilmek zorunda: bu taşıyıcı iş alabilir mi, ve adı ne? Tüm
 * {@link CarrierService} açılsaydı bu modüller belge onaylayabilir hâle gelirdi.
 */
public interface CarrierDirectory {

    /**
     * Taşıyıcı iş alabilir mi?
     *
     * <p>Yalnızca {@link CarrierStatus#APPROVED} true döner. Belgesi süresi dolan
     * taşıyıcı {@code SUSPENDED} oluyor (FR-2.4) ve buradan false alıyor — belge
     * doğrulamasının yaptırımı bu kontrol.
     */
    boolean canTakeWork(String carrierId);

    Optional<CarrierSummary> summary(String carrierId);
}
