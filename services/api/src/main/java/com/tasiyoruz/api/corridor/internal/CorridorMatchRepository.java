package com.tasiyoruz.api.corridor.internal;

import com.tasiyoruz.api.corridor.api.MatchOutcome;
import com.tasiyoruz.api.corridor.domain.CorridorMatch;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface CorridorMatchRepository extends JpaRepository<CorridorMatch, UUID> {

    List<CorridorMatch> findByCarrierIdAndOutcomeOrderByScoreDesc(String carrierId, MatchOutcome outcome);

    List<CorridorMatch> findByCorridorIdAndOutcome(UUID corridorId, MatchOutcome outcome);

    List<CorridorMatch> findByListingId(UUID listingId);

    List<CorridorMatch> findByCarrierIdAndListingId(String carrierId, UUID listingId);

    void deleteByCorridorId(UUID corridorId);

    int countByCorridorIdAndOutcome(UUID corridorId, MatchOutcome outcome);

    /**
     * Eşleşmeyi yalnızca yoksa yazar.
     *
     * <p>Aynı çifti iki yol aynı anda yazmaya çalışabiliyor: ilan yayınlanınca çalışan
     * asenkron dinleyici ile koridor kurulurken yapılan açık ilan taraması. Önce okuyup
     * sonra yazmak bu yarışı çözmüyor — iki transaction da boş okur, ikincisi kısıt
     * ihlaliyle patlar ve kendi transaction'ını da kirletir. Çakışmayı veritabanına
     * bırakmak, göç dosyasındaki idempotentlik sözünü gerçekten tutan tek yol.
     *
     * @return yazıldıysa 1, çakıştıysa 0
     */
    @Modifying
    @Query(value = """
            INSERT INTO corridor_matches
                (corridor_id, listing_id, carrier_id, score, detour_km, matched_at, outcome)
            VALUES (:corridorId, :listingId, :carrierId, :score, :detourKm, :matchedAt, 'PENDING')
            ON CONFLICT (corridor_id, listing_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("corridorId") UUID corridorId,
                       @Param("listingId") UUID listingId,
                       @Param("carrierId") String carrierId,
                       @Param("score") BigDecimal score,
                       @Param("detourKm") BigDecimal detourKm,
                       @Param("matchedAt") Instant matchedAt);
}
