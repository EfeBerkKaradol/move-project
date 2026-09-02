package com.turmove.api.catalog.internal;

import com.turmove.api.catalog.domain.CargoCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface CargoCategoryRepository extends JpaRepository<CargoCategory, String> {
    List<CargoCategory> findByActiveTrueOrderBySortOrderAsc();
}
