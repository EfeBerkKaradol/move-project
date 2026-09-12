package com.tasiyoruz.api.tracking.internal;

import com.tasiyoruz.api.tracking.domain.TripLocation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

interface TripLocationRepository extends JpaRepository<TripLocation, UUID> {

    /** En yeniden eskiye; ekran yalnızca son izi çiziyor, tamamını değil. */
    List<TripLocation> findByTripIdOrderByRecordedAtDesc(UUID tripId, Limit limit);

    /**
     * İş kapanınca izin tamamı siliniyor.
     *
     * <p>Saklamanın bir amacı vardı ve o amaç bitti: yük sahibi aracın nerede
     * olduğunu görebilsin. İş tamamlandıktan sonra tutulan konum geçmişi, hiçbir
     * ürün sorusuna cevap vermeyip yalnızca risk taşıyor.
     */
    long deleteByTripId(UUID tripId);
}
