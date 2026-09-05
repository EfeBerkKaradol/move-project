package com.tasiyoruz.api.geo.internal;

import com.tasiyoruz.api.geo.domain.DistrictEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface DistrictRepository extends JpaRepository<DistrictEntity, UUID> {
    List<DistrictEntity> findByActiveTrueOrderByCityNameAscNameAsc();

    List<DistrictEntity> findByCityCodeAndActiveTrueOrderByNameAsc(String cityCode);
}
