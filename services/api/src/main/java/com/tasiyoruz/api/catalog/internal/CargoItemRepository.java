package com.tasiyoruz.api.catalog.internal;

import com.tasiyoruz.api.catalog.domain.CargoItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface CargoItemRepository extends JpaRepository<CargoItem, String> {
    List<CargoItem> findByActiveTrueOrderBySortOrderAsc();
    List<CargoItem> findByCategoryCodeAndActiveTrueOrderBySortOrderAsc(String categoryCode);
}
