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

    /** Süre dolumu taraması: açık kalmış ama penceresi geçmiş ilanlar. */
    List<LoadListing> findByStatusAndExpiresAtBefore(ListingStatus status, Instant now);

    List<LoadListing> findByStatusInOrderByPublishedAtDesc(List<ListingStatus> statuses);

    long countByStatus(ListingStatus status);

    /**
     * Yayından ilk teklife geçen ortalama süre (saniye) ve örneklem büyüklüğü.
     *
     * <p>Native sorgu: JPQL'de zaman farkı ifade edilemiyor. Yalnızca teklif almış
     * ilanlar sayılıyor — hiç teklif almamışları sıfır saymak ortalamayı çökertirdi,
     * sonsuz saymak da anlamsız olurdu.
     */
    @Query(value = """
            SELECT count(*) AS ornek, coalesce(avg(saniye), 0) AS ortalama
            FROM (
                SELECT extract(epoch FROM (min(o.submitted_at) - l.published_at)) AS saniye
                FROM load_listings l
                JOIN carrier_offers o ON o.listing_id = l.id
                GROUP BY l.id, l.published_at
            ) t
            """, nativeQuery = true)
    Object[] firstOfferStats();

    @Query(value = "select nextval('listing_number_seq')", nativeQuery = true)
    long nextListingNumber();
}
