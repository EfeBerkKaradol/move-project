package com.turmove.api.pricing.internal;

import com.turmove.api.pricing.domain.PlatformCommission;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface PlatformCommissionRepository extends JpaRepository<PlatformCommission, UUID> {
    Optional<PlatformCommission> findFirstByCityCodeIsNullOrderByVersionDesc();
}
