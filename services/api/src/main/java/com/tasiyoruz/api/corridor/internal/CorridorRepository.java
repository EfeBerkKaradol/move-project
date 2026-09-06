package com.tasiyoruz.api.corridor.internal;

import com.tasiyoruz.api.corridor.api.CorridorStatus;
import com.tasiyoruz.api.corridor.domain.Corridor;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface CorridorRepository extends JpaRepository<Corridor, UUID> {

    List<Corridor> findByCarrierIdOrderByCreatedAtDesc(String carrierId);

    /** Eşleştirme adayları: aktif ve kalkış penceresi geçmemiş koridorlar. */
    @Query("""
            select c from Corridor c
            where c.status = :status and c.departureTo >= :now
            """)
    List<Corridor> findMatchable(@Param("status") CorridorStatus status, @Param("now") Instant now);
}
