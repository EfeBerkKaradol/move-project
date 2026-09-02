package com.turmove.api.pricing.internal;

import com.turmove.api.pricing.domain.PlatformCommission;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface PlatformCommissionRepository extends JpaRepository<PlatformCommission, UUID> {

    /**
     * O an geçerli komisyon oranı.
     *
     * <p>Geçerlilik penceresi filtrelenmezse komisyonsuz dönem kaydı (validTo = 2027-03-31)
     * süresi dolduktan sonra da %0 dönmeye devam ederdi — komisyona geçiş sessizce
     * çalışmazdı.
     */
    @Query("""
            select c from PlatformCommission c
            where c.cityCode is null
              and c.validFrom <= :now
              and (c.validTo is null or c.validTo > :now)
            order by c.version desc
            limit 1
            """)
    Optional<PlatformCommission> findActive(@Param("now") Instant now);
}
