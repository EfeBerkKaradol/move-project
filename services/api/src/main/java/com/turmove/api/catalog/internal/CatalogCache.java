package com.turmove.api.catalog.internal;

import com.turmove.api.catalog.domain.CargoItem;
import com.turmove.api.catalog.domain.VehicleType;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

/**
 * Katalog okumalarının önbellekli sarmalayıcısı.
 *
 * <p>Ayrı bir bean olması şart: {@code @Cacheable} Spring proxy'si üzerinden çalışır,
 * aynı sınıf içinden yapılan çağrılarda (self-invocation) devreye girmez. Önbellek
 * mantığını servisin içine koymak, sessizce cache'siz çalışan bir sisteme yol açardı.
 */
@Component
class CatalogCache {

    private final VehicleTypeRepository vehicleTypes;
    private final CargoItemRepository cargoItems;

    CatalogCache(VehicleTypeRepository vehicleTypes, CargoItemRepository cargoItems) {
        this.vehicleTypes = vehicleTypes;
        this.cargoItems = cargoItems;
    }

    /** Filo, sortOrder'a göre küçükten büyüğe — öneri motorunun sıralama temeli. */
    @Cacheable("vehicleTypes")
    List<VehicleType> activeFleet() {
        return vehicleTypes.findByActiveTrueOrderBySortOrderAsc();
    }

    @Cacheable("cargoItems")
    Map<String, CargoItem> itemsByCode() {
        return cargoItems.findByActiveTrueOrderBySortOrderAsc().stream()
                .collect(Collectors.toMap(CargoItem::getCode, i -> i));
    }
}
