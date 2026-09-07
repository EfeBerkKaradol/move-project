package com.tasiyoruz.api.fleet.internal;

import com.tasiyoruz.api.fleet.api.DocumentStatus;
import com.tasiyoruz.api.fleet.domain.CarrierDocument;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface CarrierDocumentRepository extends JpaRepository<CarrierDocument, UUID> {

    /** Süre dolumu taraması (FR-2.4). */
    @Query("""
            select d from CarrierDocument d
            where d.status = :status and d.expiresOn is not null and d.expiresOn < :today
            """)
    List<CarrierDocument> findExpired(@Param("status") DocumentStatus status, @Param("today") LocalDate today);

    /** Uyarı listesi (FR-2.4): süresi belirli bir pencerede dolacak onaylı belgeler. */
    List<CarrierDocument> findByStatusAndExpiresOnLessThanEqualOrderByExpiresOnAsc(
            DocumentStatus status, LocalDate until);
}
