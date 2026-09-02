package com.turmove.api.catalog.internal;

import com.turmove.api.catalog.domain.VehicleType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface VehicleTypeRepository extends JpaRepository<VehicleType, String> {
    List<VehicleType> findByActiveTrueOrderBySortOrderAsc();
}
