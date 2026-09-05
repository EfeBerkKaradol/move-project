package com.tasiyoruz.api.ordering.internal;

import com.tasiyoruz.api.ordering.api.ListingStatus;
import com.tasiyoruz.api.ordering.domain.LoadListing;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface LoadListingRepository extends JpaRepository<LoadListing, UUID> {

    List<LoadListing> findByShipperIdOrderByPublishedAtDesc(String shipperId);

    @Query("""
            select l from LoadListing l
            where l.status = :status and l.expiresAt > :now
              and (:vehicleType is null or l.vehicleTypeCode = :vehicleType)
              and (:pickupDistrictIds is null or l.pickupDistrictId in :pickupDistrictIds)
            order by l.publishedAt desc
            """)
    List<LoadListing> findOpen(@Param("status") ListingStatus status, @Param("now") Instant now,
                               @Param("vehicleType") String vehicleType,
                               @Param("pickupDistrictIds") List<UUID> pickupDistrictIds);

    @Query(value = "select nextval('listing_number_seq')", nativeQuery = true)
    long nextListingNumber();
}
