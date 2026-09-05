package com.tasiyoruz.api.ordering.internal;

import static com.tasiyoruz.api.ordering.internal.MarketplaceExceptions.*;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tasiyoruz.api.geo.api.District;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.*;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingAwarded;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.ListingPublished;
import com.tasiyoruz.api.ordering.api.MarketplaceEvents.OfferSubmitted;
import com.tasiyoruz.api.ordering.domain.CarrierOffer;
import com.tasiyoruz.api.ordering.domain.DomainAccess;
import com.tasiyoruz.api.ordering.domain.LoadListing;
import com.tasiyoruz.api.pricing.api.Money;
import com.tasiyoruz.api.pricing.api.PricingService;
import com.tasiyoruz.api.pricing.api.QuoteRequest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tek turlu teklif pazarı.
 *
 * <p>Fiyat tahmini istemciden alınmaz; ilan yayınlanırken tarife sunucuda yeniden
 * hesaplanır ve snapshot olarak yazılır. Kabul işlemi {@code @Version} ile korunur:
 * aynı ilana iki kabul ya da kabul+iptal yarışında ikinci yazan 409 alır.
 */
@Service
@Transactional
class DefaultMarketplaceService implements MarketplaceService {

    /** Anlık ilan bu süre teklif toplar; planlıda pencere başlangıcına kadar (docs/11). */
    static final Duration INSTANT_TTL = Duration.ofHours(6);
    static final Duration SCHEDULED_FALLBACK_TTL = Duration.ofHours(72);

    private final LoadListingRepository listings;
    private final CarrierOfferRepository offers;
    private final GeoService geo;
    private final PricingService pricing;
    private final ApplicationEventPublisher events;
    private final ObjectMapper mapper;
    private final Clock clock;

    DefaultMarketplaceService(LoadListingRepository listings, CarrierOfferRepository offers, GeoService geo,
                              PricingService pricing, ApplicationEventPublisher events, ObjectMapper mapper,
                              Clock clock) {
        this.listings = listings;
        this.offers = offers;
        this.geo = geo;
        this.pricing = pricing;
        this.events = events;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Override
    public ListingView publish(String shipperId, CreateListingRequest r) {
        var pickup = geo.district(r.pickup().districtId()).orElseThrow(() -> badRequest("Alış ilçesi tanınmadı."));
        var dropoff = geo.district(r.dropoff().districtId()).orElseThrow(() -> badRequest("Teslim ilçesi tanınmadı."));
        if (r.pickupWindowStart() != null && r.pickupWindowEnd() != null
                && r.pickupWindowEnd().isBefore(r.pickupWindowStart())) {
            throw badRequest("Alış penceresinin bitişi başlangıçtan önce olamaz.");
        }

        // Referans fiyat sunucuda hesaplanır — istemcinin gönderdiği tutara güvenilmez
        var quote = pricing.quote(new QuoteRequest(
                r.serviceModel(), r.vehicleTypeCode(),
                List.of(new QuoteRequest.Stop(pickup.id(), r.pickup().floor(), r.pickup().hasElevator()),
                        new QuoteRequest.Stop(dropoff.id(), r.dropoff().floor(), r.dropoff().hasElevator())),
                r.extraServicesOrEmpty(), null));

        var now = Instant.now(clock);
        var expiresAt = "SCHEDULED".equals(r.serviceModel())
                ? Optional.ofNullable(r.pickupWindowStart()).orElse(now.plus(SCHEDULED_FALLBACK_TTL))
                : now.plus(INSTANT_TTL);

        var number = "TS-%d-%06d".formatted(now.atZone(ZoneOffset.UTC).getYear(), listings.nextListingNumber());
        Map<String, Object> snapshot = mapper.convertValue(quote, new TypeReference<>() {});

        var listing = listings.save(LoadListing.publish(number, shipperId, r.serviceModel(), r.vehicleTypeCode(),
                UUID.fromString(pickup.id()), UUID.fromString(dropoff.id()),
                r.pickup().floor(), r.pickup().hasElevator(), r.dropoff().floor(), r.dropoff().hasElevator(),
                r.extraServicesOrEmpty(), r.cargoDescription(), r.pickupWindowStart(), r.pickupWindowEnd(),
                snapshot, quote.totalAmount().amount(), now, expiresAt));

        events.publishEvent(new ListingPublished(listing.getId().toString(), listing.getVehicleTypeCode(),
                pickup.id(), dropoff.id(), listing.getEstimatedAmount()));
        return view(listing);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ListingView> listing(String listingId) {
        return parse(listingId).flatMap(listings::findById).map(this::view);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ListingView> listingsOf(String shipperId) {
        return listings.findByShipperIdOrderByPublishedAtDesc(shipperId).stream().map(this::view).toList();
    }

    @Override
    public ListingView cancel(String shipperId, String listingId, String reason) {
        var listing = owned(shipperId, listingId);
        if (listing.getStatus() != ListingStatus.OPEN) {
            throw conflict("Yalnızca açık ilan iptal edilebilir.");
        }
        var now = Instant.now(clock);
        DomainAccess.cancel(listing, reason, now);
        offers.findByListingIdOrderBySubmittedAtAsc(listing.getId()).stream()
                .filter(o -> o.getStatus() == OfferStatus.SUBMITTED)
                .forEach(o -> respond(o, OfferStatus.REJECTED, now));
        return view(listing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ListingView> openListings(String vehicleTypeCode, String cityCode) {
        List<UUID> districtIds = cityCode == null ? null
                : geo.districtsOf(cityCode).stream().map(d -> UUID.fromString(d.id())).toList();
        if (districtIds != null && districtIds.isEmpty()) return List.of();
        return listings.findOpen(ListingStatus.OPEN, Instant.now(clock), vehicleTypeCode, districtIds).stream()
                .map(l -> view(l).forCarrier())
                .toList();
    }

    @Override
    public OfferView submitOffer(String carrierId, String carrierDisplayName, String listingId,
                                 SubmitOfferRequest r) {
        var listing = parse(listingId).flatMap(listings::findById).orElseThrow(() -> notFound("İlan"));
        var now = Instant.now(clock);
        if (!listing.isOpen(now)) {
            throw conflict("İlan artık teklif almıyor.");
        }
        if (listing.isOwnedBy(carrierId)) {
            throw conflict("Kendi ilanınıza teklif veremezsiniz.");
        }

        var existing = offers.findByListingIdAndCarrierId(listing.getId(), carrierId);
        CarrierOffer offer;
        if (existing.isPresent()) {
            offer = existing.get();
            if (offer.getStatus() != OfferStatus.WITHDRAWN) {
                // Tek tur: mevcut teklif değiştirilemez, ancak geri çekilip yeniden verilebilir
                throw conflict("Bu ilana zaten teklif verdiniz.");
            }
            resubmit(offer, r, now);
        } else {
            offer = offers.save(CarrierOffer.submit(listing.getId(), carrierId, carrierDisplayName,
                    r.amount(), r.note(), r.estimatedPickupAt(), now));
        }

        events.publishEvent(new OfferSubmitted(listingId, offer.getId().toString(), carrierId, r.amount()));
        return view(offer);
    }

    @Override
    public OfferView withdrawOffer(String carrierId, String offerId) {
        var offer = parse(offerId).flatMap(offers::findById).orElseThrow(() -> notFound("Teklif"));
        if (!offer.getCarrierId().equals(carrierId)) throw forbidden();
        if (offer.getStatus() != OfferStatus.SUBMITTED) {
            throw conflict("Yalnızca bekleyen teklif geri çekilebilir.");
        }
        respond(offer, OfferStatus.WITHDRAWN, Instant.now(clock));
        return view(offer);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfferView> offersOf(String carrierId) {
        return offers.findByCarrierIdOrderBySubmittedAtDesc(carrierId).stream().map(this::view).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfferView> offersForListing(String shipperId, String listingId) {
        var listing = owned(shipperId, listingId);
        return offers.findByListingIdOrderBySubmittedAtAsc(listing.getId()).stream().map(this::view).toList();
    }

    @Override
    public ListingView acceptOffer(String shipperId, String listingId, String offerId) {
        var listing = owned(shipperId, listingId);
        var now = Instant.now(clock);
        if (!listing.isOpen(now)) {
            throw conflict("İlan artık açık değil.");
        }
        var chosen = parse(offerId).flatMap(offers::findById)
                .filter(o -> o.getListingId().equals(listing.getId()))
                .orElseThrow(() -> notFound("Teklif"));
        if (chosen.getStatus() != OfferStatus.SUBMITTED) {
            throw conflict("Bu teklif artık geçerli değil.");
        }

        for (var o : offers.findByListingIdOrderBySubmittedAtAsc(listing.getId())) {
            if (o.getStatus() != OfferStatus.SUBMITTED) continue;
            respond(o, o.getId().equals(chosen.getId()) ? OfferStatus.ACCEPTED : OfferStatus.REJECTED, now);
        }
        award(listing, chosen.getId());
        // @Version: aynı anda ikinci kabul/iptal gelirse commit'te
        // ObjectOptimisticLockingFailureException → 409

        events.publishEvent(new ListingAwarded(listingId, offerId, chosen.getCarrierId(), shipperId,
                chosen.getAmount()));
        return view(listing);
    }

    // --- yardımcılar ---

    private LoadListing owned(String shipperId, String listingId) {
        var listing = parse(listingId).flatMap(listings::findById).orElseThrow(() -> notFound("İlan"));
        if (!listing.isOwnedBy(shipperId)) throw forbidden();
        return listing;
    }

    private static Optional<UUID> parse(String id) {
        try {
            return Optional.of(UUID.fromString(id));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private ListingView view(LoadListing l) {
        return new ListingView(l.getId().toString(), l.getListingNumber(), l.getShipperId(),
                l.getServiceModel(), l.getVehicleTypeCode(),
                place(l.getPickupDistrictId(), l.getPickupFloor(), l.getPickupHasElevator()),
                place(l.getDropoffDistrictId(), l.getDropoffFloor(), l.getDropoffHasElevator()),
                l.getExtraServices(), l.getCargoDescription(), l.getPickupWindowStart(), l.getPickupWindowEnd(),
                Money.tryOf(l.getEstimatedAmount()), l.getEstimateSnapshot(), l.getStatus(),
                l.getAwardedOfferId() == null ? null : l.getAwardedOfferId().toString(),
                offers.countByListingIdAndStatus(l.getId(), OfferStatus.SUBMITTED),
                l.getPublishedAt(), l.getExpiresAt());
    }

    private ListingView.Place place(UUID districtId, Integer floor, Boolean elevator) {
        var d = geo.district(districtId.toString());
        return new ListingView.Place(districtId.toString(),
                d.map(District::cityName).orElse(null), d.map(District::name).orElse(null), floor, elevator);
    }

    private OfferView view(CarrierOffer o) {
        return new OfferView(o.getId().toString(), o.getListingId().toString(), o.getCarrierId(),
                o.getCarrierDisplayName(), Money.tryOf(o.getAmount()), o.getNote(), o.getEstimatedPickupAt(),
                o.getStatus(), null, null, o.getSubmittedAt(), o.getRespondedAt());
    }

    // Domain'in paket-özel mutasyonlarına erişim (aynı modül, farklı paket)
    private static void respond(CarrierOffer o, OfferStatus s, Instant now) { DomainAccess.respond(o, s, now); }
    private static void resubmit(CarrierOffer o, SubmitOfferRequest r, Instant now) {
        DomainAccess.resubmit(o, r.amount(), r.note(), r.estimatedPickupAt(), now);
    }
    private static void award(LoadListing l, UUID offerId) { DomainAccess.award(l, offerId); }
}
