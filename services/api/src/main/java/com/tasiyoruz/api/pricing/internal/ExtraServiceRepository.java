package com.tasiyoruz.api.pricing.internal;

import com.tasiyoruz.api.pricing.domain.ExtraService;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ExtraServiceRepository extends JpaRepository<ExtraService, String> {
    List<ExtraService> findByActiveTrueOrderBySortOrderAsc();
}
