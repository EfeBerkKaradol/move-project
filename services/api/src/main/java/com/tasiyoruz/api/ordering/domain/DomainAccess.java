package com.tasiyoruz.api.ordering.domain;

import com.tasiyoruz.api.ordering.api.OfferStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Durum geçişlerini yalnızca servis katmanına açar. Entity setter'ları paket-özel;
 * controller ya da başka modül bir ilanı doğrudan AWARDED yapamaz.
 */
public final class DomainAccess {
    private DomainAccess() {}

    public static void respond(CarrierOffer o, OfferStatus s, Instant now) { o.respond(s, now); }
    public static void resubmit(CarrierOffer o, BigDecimal amount, String note, Instant pickupAt, Instant now) {
        o.resubmit(amount, note, pickupAt, now);
    }
    public static void award(LoadListing l, UUID offerId) { l.award(offerId); }
    public static void cancel(LoadListing l, String reason, Instant now) { l.cancel(reason, now); }
}
