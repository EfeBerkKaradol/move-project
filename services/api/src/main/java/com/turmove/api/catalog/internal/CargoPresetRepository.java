package com.turmove.api.catalog.internal;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface CargoPresetRepository extends JpaRepository<CargoPreset, String> {
    List<CargoPreset> findByCategoryCodeOrderBySortOrderAsc(String categoryCode);

    List<CargoPreset> findAllByOrderBySortOrderAsc();
}
