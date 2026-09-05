package com.tasiyoruz.api.catalog.internal;

import com.tasiyoruz.api.catalog.domain.CargoCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface CargoCategoryRepository extends JpaRepository<CargoCategory, String> {
    List<CargoCategory> findByActiveTrueOrderBySortOrderAsc();
}
