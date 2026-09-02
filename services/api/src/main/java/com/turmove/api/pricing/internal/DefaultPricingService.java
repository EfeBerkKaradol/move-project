package com.turmove.api.pricing.internal;

import com.turmove.api.geo.api.District;
import com.turmove.api.geo.api.GeoPoint;
import com.turmove.api.geo.api.GeoService;
import com.turmove.api.geo.api.RouteProvider;
import com.turmove.api.pricing.api.*;
import com.turmove.api.pricing.domain.ExtraService;
import com.turmove.api.pricing.domain.RateCard;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Fiyat hesaplama.
 *
 * <p>Kural: her kalem dökümde ayrı satır olarak görünür ve toplam bu satırların
 * toplamıdır. Gizli kalem yok (FR-5.5) — kullanıcı ne için ne ödediğini görmeden
 * sipariş vermez.
 */
@Service
class DefaultPricingService implements PricingService {

    /** Teklif geçerlilik süresi (FR-5.6). */
    private static final Duration QUOTE_TTL = Duration.ofMinutes(15);

    /** Pazarlıkta müşterinin inebileceği taban — referans fiyatın %70'i (docs/10). */
    private static final BigDecimal NEGOTIATION_FLOOR_PERCENT = new BigDecimal("0.70");

    private final RateCardRepository rateCards;
    private final ExtraServiceRepository extraServices;
    private final PlatformCommissionRepository commissions;
    private final GeoService geoService;
    private final RouteProvider routeProvider;
    private final QuoteSigner signer;

    DefaultPricingService(
            RateCardRepository rateCards,
            ExtraServiceRepository extraServices,
            PlatformCommissionRepository commissions,
            GeoService geoService,
            RouteProvider routeProvider,
            QuoteSigner signer) {
        this.rateCards = rateCards;
        this.extraServices = extraServices;
        this.commissions = commissions;
        this.geoService = geoService;
        this.routeProvider = routeProvider;
        this.signer = signer;
    }

    @Override
    public Quote quote(QuoteRequest request) {
        var stops = resolveStops(request);
        var cityCode = stops.getFirst().cityCode();

        var route = routeProvider.estimate(
                stops.stream().map(d -> new GeoPoint(d.lat(), d.lng())).toList());

        var card = rateCards
                .findFirstByCityCodeAndVehicleTypeCodeAndServiceModelAndCarrierIdIsNullAndActiveTrueOrderByVersionDesc(
                        cityCode, request.vehicleTypeCode(), request.serviceModel())
                .orElseThrow(() -> new NoRateCardException(cityCode, request.vehicleTypeCode()));

        var lines = new ArrayList<Quote.BreakdownLine>();

        // 1) Taban ücret
        lines.add(line("BASE_FARE", "Taban ücret", card.getBaseFare(), null));

        // 2) Mesafe — dahil km düşülür, kalan kademeli ücretlendirilir
        var km = BigDecimal.valueOf(route.distanceMeters()).divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP);
        var chargeableKm = km.subtract(card.getIncludedKm()).max(BigDecimal.ZERO);
        if (chargeableKm.signum() > 0) {
            var distanceCost = tieredDistanceCost(card, chargeableKm);
            lines.add(line("DISTANCE", "Mesafe (%s km)".formatted(tr(km)), distanceCost,
                    route.approximate() ? "Takribî mesafe — harita servisi devreye girince kesinleşecek" : null));
        }

        // 3) Süre
        var minutes = BigDecimal.valueOf(route.durationSeconds()).divide(BigDecimal.valueOf(60), 0, RoundingMode.HALF_UP);
        var durationCost = card.getPerMinuteRate().multiply(minutes);
        if (durationCost.signum() > 0) {
            lines.add(line("DURATION", "Süre (%s dk)".formatted(minutes.toPlainString()), durationCost, null));
        }

        var subtotal = sum(lines);

        // 4) Ek hizmetler
        //
        // Asansörsüz kat, kullanıcı açıkça seçmese de duraklardan türetilir. İki yol
        // aynı hesaba çıkmalı: aksi hâlde isteğe "NO_ELEVATOR" eklemek ücreti kat
        // sayısından bağımsız tek birime düşürüp eksik faturalamaya yol açar.
        var catalog = extraServices.findByActiveTrueOrderBySortOrderAsc();
        var noElevatorFloors = noElevatorFloors(request);

        var requestedCodes = new java.util.LinkedHashSet<>(request.extraServicesOrEmpty());
        if (noElevatorFloors > 0) {
            requestedCodes.add("NO_ELEVATOR");
        }

        for (var code : requestedCodes) {
            var svc = catalog.stream().filter(s -> s.getCode().equals(code)).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Bilinmeyen ek hizmet: " + code));
            var units = units(svc, request, noElevatorFloors);
            if (units == 0) continue;
            var label = "NO_ELEVATOR".equals(code)
                    ? "Asansörsüz kat (%d kat)".formatted(noElevatorFloors)
                    : svc.getDisplayName();
            lines.add(line(code, label, extraCost(svc, subtotal, units), null));
        }

        // 6) Minimum ücret kontrolü
        var beforeMinimum = sum(lines);
        if (beforeMinimum.compareTo(card.getMinimumFare()) < 0) {
            lines.add(line("MINIMUM_FARE_ADJUSTMENT", "Minimum ücret farkı",
                    card.getMinimumFare().subtract(beforeMinimum), null));
        }

        // 7) Platform komisyonu — %0 olsa bile satır olarak görünür (FR-5.8)
        var commissionPercent = commissions.findActive(Instant.now())
                .map(c -> c.getPercent())
                .orElse(BigDecimal.ZERO);
        var total = sum(lines);
        var commission = total.multiply(commissionPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        lines.add(line("COMMISSION", "Platform komisyonu", commission,
                commissionPercent.signum() == 0
                        ? "2027 ilk çeyreğine kadar komisyon alınmıyor — ödediğiniz tutarın tamamı nakliyeciye gidiyor"
                        : null));

        var grandTotal = sum(lines);
        var expiresAt = Instant.now().plus(QUOTE_TTL);
        var quoteId = "qt_" + UUID.randomUUID();

        return new Quote(
                quoteId,
                request.serviceModel(),
                request.vehicleTypeCode(),
                route.distanceMeters(),
                route.durationSeconds(),
                route.approximate(),
                lines,
                Money.tryOf(grandTotal),
                Money.tryOf(grandTotal.multiply(NEGOTIATION_FLOOR_PERCENT)),
                expiresAt,
                signer.sign(quoteId, grandTotal, expiresAt));
    }

    // --- yardımcılar ---

    private List<District> resolveStops(QuoteRequest request) {
        var resolved = request.stops().stream()
                .map(s -> geoService.district(s.districtId())
                        .orElseThrow(() -> new OutOfServiceAreaException(s.districtId())))
                .toList();

        var cityCode = resolved.getFirst().cityCode();
        if (resolved.stream().anyMatch(d -> !d.cityCode().equals(cityCode))) {
            // Şehirlerarası taşıma MVP kapsamı dışında (docs/01 §3)
            throw new InterCityNotSupportedException();
        }
        return resolved;
    }

    /**
     * Kademeli mesafe ücreti. Hatay gibi il içi mesafeleri uzun şehirlerde uzayan
     * kilometre daha ucuz ücretlendirilir; sabit km ücreti orada zarar ettirirdi.
     */
    private BigDecimal tieredDistanceCost(RateCard card, BigDecimal chargeableKm) {
        var tiers = card.getDistanceTiers();
        if (tiers == null || tiers.isEmpty()) {
            return card.getPerKmRate().multiply(chargeableKm);
        }

        var cost = BigDecimal.ZERO;
        for (var tier : tiers) {
            var from = tier.fromKm();
            var to = tier.toKm() == null ? chargeableKm : tier.toKm().min(chargeableKm);
            var span = to.subtract(from);
            if (span.signum() > 0) {
                cost = cost.add(card.getPerKmRate().multiply(tier.factor()).multiply(span));
            }
            if (tier.toKm() != null && chargeableKm.compareTo(tier.toKm()) <= 0) break;
        }
        return cost;
    }

    private BigDecimal extraCost(ExtraService svc, BigDecimal subtotal, int units) {
        return switch (svc.getPricingType()) {
            case "FIXED" -> svc.getRate();
            case "PERCENT" -> subtotal.multiply(svc.getRate()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            case "PER_UNIT" -> svc.getRate().multiply(BigDecimal.valueOf(units));
            default -> throw new IllegalStateException("Bilinmeyen ücret tipi: " + svc.getPricingType());
        };
    }

    /** PER_UNIT hizmetlerin birim sayısı. Sabit fiyatlılarda anlamsız olduğu için 1. */
    private int units(ExtraService svc, QuoteRequest request, int noElevatorFloors) {
        if (!"PER_UNIT".equals(svc.getPricingType())) return 1;
        return switch (svc.getCode()) {
            case "NO_ELEVATOR" -> noElevatorFloors;
            case "EXTRA_STOP" -> Math.max(0, request.stops().size() - 2);
            // Bekleme süresi taşıma bitince belli olur; teklif anında ücretlendirilmez
            case "WAITING" -> 0;
            default -> 1;
        };
    }

    /** Asansörsüz üst katlarda taşınacak toplam kat sayısı. */
    private static int noElevatorFloors(QuoteRequest request) {
        return request.stops().stream()
                .filter(s -> Boolean.FALSE.equals(s.hasElevator()) && s.floor() != null && s.floor() > 1)
                .mapToInt(QuoteRequest.Stop::floor)
                .sum();
    }

    private static Quote.BreakdownLine line(String code, String label, BigDecimal amount, String note) {
        return new Quote.BreakdownLine(code, label, Money.tryOf(amount), note);
    }

    private static BigDecimal sum(List<Quote.BreakdownLine> lines) {
        return lines.stream().map(l -> l.amount().amount()).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Türkçe ondalık ayracı virgüldür. */
    private static String tr(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString().replace('.', ',');
    }
}
