package com.tasiyoruz.api.compliance.api;

import java.util.List;

/**
 * Yayınlanan bir ilanın beyanının taranması.
 *
 * <p>Pazar yeri modülü bunu ilan yayınlanırken çağırıyor. Tarama <strong>ilanı
 * engellemiyor</strong>: kelime eşleşmesi bağlamı bilmiyor ve masum bir ilanı
 * durdurmak, gerçek bir ihlali yakalamaktan daha sık olurdu. Şüphe halinde bir
 * inceleme kaydı açılıyor, ilan yoluna devam ediyor.
 */
public interface CargoScreening {

    /**
     * @param itemNames beyandaki kalem adları — serbest metinle birlikte taranıyor
     */
    void screenListing(String userId, String listingId, String cargoDescription, List<String> itemNames);
}
