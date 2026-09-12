package com.tasiyoruz.api.fleet.internal;

import com.tasiyoruz.api.fleet.api.CarrierStatus;
import com.tasiyoruz.api.fleet.domain.CarrierProfile;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface CarrierProfileRepository extends JpaRepository<CarrierProfile, UUID> {

    Optional<CarrierProfile> findByCarrierId(String carrierId);

    List<CarrierProfile> findByStatusOrderBySubmittedAtAsc(CarrierStatus status);

    List<CarrierProfile> findAllByOrderByCreatedAtDesc();

    long countByStatus(CarrierStatus status);

    /**
     * Araç tipine göre onaylı taşıyıcı sayısı.
     *
     * <p>Tek tek profil çekip bellekte gruplamak yerine tek sorgu: bu sayfa
     * herkese açık ve taşıyıcı sayısı büyüdükçe listenin tamamını taşımanın
     * anlamı yok. Araç tipi olmayan (eski) kayıtlar dışarıda kalıyor.
     */
    @Query("""
            SELECT p.vehicleTypeCode, COUNT(p)
            FROM CarrierProfile p
            WHERE p.status = :status AND p.vehicleTypeCode IS NOT NULL
            GROUP BY p.vehicleTypeCode
            """)
    List<Object[]> countByVehicleType(@Param("status") CarrierStatus status);
}
