package com.tasiyoruz.api.catalog.api;

import java.util.List;
import java.util.OptionalInt;

/**
 * Filoyu kapasite sırasıyla açar.
 *
 * <p>Koridor eşleştirme, "bu aracın kapasitesi ilanın istediği aracı karşılıyor mu?"
 * sorusunu sormak zorunda; katalogun iç sınıflarına bağımlı olmadan sorabilmesi için
 * sıra bilgisi buradan veriliyor. Sıra, öneri motorunun kullandığı {@code sortOrder}
 * ile aynı: küçükten büyüğe (motokurye → tır).
 */
public interface FleetService {

    /** Hizmete açık filo, kapasiteye göre küçükten büyüğe. */
    List<FleetVehicle> activeFleet();

    /**
     * Aracın kapasite sırası. Büyük sıra, büyük araç demektir; bir koridor aracı
     * yalnızca kendi sırasına eşit ya da daha küçük araç isteyen ilanları taşıyabilir.
     *
     * @return kod tanınmıyorsa boş
     */
    OptionalInt capacityRank(String vehicleTypeCode);
}
