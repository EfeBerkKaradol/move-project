package com.turmove.api.pricing.internal;

import com.turmove.api.pricing.domain.ExtraService;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ExtraServiceRepository extends JpaRepository<ExtraService, String> {
    List<ExtraService> findByActiveTrueOrderBySortOrderAsc();
}
