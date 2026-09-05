package com.tasiyoruz.api.ordering.api;

import java.util.List;
import java.util.Optional;

/** Teklif pazarı: ilan yayınla → teklif topla → seç. */
public interface MarketplaceService {

    ListingView publish(String shipperId, CreateListingRequest request);

    Optional<ListingView> listing(String listingId);

    List<ListingView> listingsOf(String shipperId);

    ListingView cancel(String shipperId, String listingId, String reason);

    /** Açık ve süresi dolmamış ilanlar; araç tipi ve alış ili filtrelenebilir. */
    List<ListingView> openListings(String vehicleTypeCode, String cityCode);

    OfferView submitOffer(String carrierId, String carrierDisplayName, String listingId, SubmitOfferRequest request);

    OfferView withdrawOffer(String carrierId, String offerId);

    List<OfferView> offersOf(String carrierId);

    /** Yalnızca ilan sahibi görür. */
    List<OfferView> offersForListing(String shipperId, String listingId);

    /** Seçilen teklif kabul edilir, diğerleri reddedilir, ilan AWARDED olur. */
    ListingView acceptOffer(String shipperId, String listingId, String offerId);
}
