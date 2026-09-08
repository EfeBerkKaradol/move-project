package com.tasiyoruz.api.ordering.internal;

import com.tasiyoruz.api.ordering.api.ListingStatus;
import com.tasiyoruz.api.ordering.domain.LoadListing;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Component;

/**
 * Bir araç sahibi hangi ilanı görebilir?
 *
 * <p>Kural iki yerde gerekiyor — ilan detayı ve yük fotoğrafı — ve ikisinin ayrışması
 * en kötü hatayı üretirdi: üstverisi gizlenmiş bir ilanın fotoğrafının açık kalması.
 * Bu yüzden tek yerde duruyor.
 *
 * <p>Açık ilan herkese açık değil ama teklif verebilecek herkese açık: zaten açık ilan
 * akışında listeleniyor. İş verildikten sonra yalnızca işi alan taşıyıcıda kalıyor —
 * teklifi reddedilenin yükün fotoğrafına bakmayı sürdürmesi için sebep yok.
 */
@Component
class CarrierVisibility {

    private final CarrierOfferRepository offers;
    private final Clock clock;

    CarrierVisibility(CarrierOfferRepository offers, Clock clock) {
        this.offers = offers;
        this.clock = clock;
    }

    boolean maySee(LoadListing listing, String carrierId) {
        if (listing.isOpen(Instant.now(clock))) return true;
        if (listing.getStatus() != ListingStatus.AWARDED || listing.getAwardedOfferId() == null) return false;
        return offers.findById(listing.getAwardedOfferId())
                .map(o -> o.getCarrierId().equals(carrierId))
                .orElse(false);
    }
}
