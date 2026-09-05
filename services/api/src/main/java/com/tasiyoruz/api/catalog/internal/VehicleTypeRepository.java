package com.tasiyoruz.api.catalog.internal;

import com.tasiyoruz.api.catalog.domain.VehicleType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface VehicleTypeRepository extends JpaRepository<VehicleType, String> {
    List<VehicleType> findByActiveTrueOrderBySortOrderAsc();

    /** Hizmete açılmamış araçlar da dönüyor — arayüz onları "Yakında" olarak gösteriyor. */
    List<VehicleType> findAllByOrderBySortOrderAsc();
}
