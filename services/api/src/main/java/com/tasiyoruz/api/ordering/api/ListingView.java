package com.tasiyoruz.api.ordering.api;

import com.tasiyoruz.api.pricing.api.Money;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * İlanın dışa görünümü. {@code shipperId} taşıyıcıya gösterilmez; taşıyıcı akışı bu
 * kaydın {@link #forCarrier()} hâlini alır.
 *
 * <p>Beyan ve fotoğraflar taşıyıcı görünümünde <strong>kalıyor</strong>: teklifin
 * isabetli olması için görülmesi gereken şey tam olarak bunlar. Gizlenen, yükün ne
 * olduğu değil kimin ve nerede olduğu.
 */
public record ListingView(
        String id,
        String listingNumber,
        String shipperId,
        String serviceModel,
        String vehicleTypeCode,
        Place pickup,
        Place dropoff,
        List<String> extraServices,
        List<DeclaredItem> cargoItems,
        List<ListingPhotoView> photos,
        String cargoDescription,
        Instant pickupWindowStart,
        Instant pickupWindowEnd,
        Money estimatedAmount,
        Map<String, Object> estimate,
        ListingStatus status,
        String awardedOfferId,
        int offerCount,
        Instant publishedAt,
        Instant expiresAt) {

    /** İlçe düzeyi; adres taşıyıcıya atama sonrasında açılır. */
    public record Place(String districtId, String cityName, String districtName,
                        Integer floor, Boolean hasElevator) {}

    /** Beyan edilen toplam hacim — araç sahibi kasasına sığar mı diye buna bakıyor. */
    public BigDecimal declaredVolumeM3() {
        return cargoItems.stream().map(DeclaredItem::totalVolumeM3)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public int declaredWeightKg() {
        return cargoItems.stream().mapToInt(DeclaredItem::totalWeightKg).sum();
    }

    public ListingView forCarrier() {
        return new ListingView(id, listingNumber, null, serviceModel, vehicleTypeCode, pickup, dropoff,
                extraServices, cargoItems, photos, cargoDescription, pickupWindowStart, pickupWindowEnd,
                estimatedAmount, estimate, status, awardedOfferId, offerCount, publishedAt, expiresAt);
    }
}
