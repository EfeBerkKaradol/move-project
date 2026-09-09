package com.tasiyoruz.api.pricing.internal;

import com.tasiyoruz.api.pricing.api.Money;
import com.tasiyoruz.api.pricing.api.Quote;
import com.tasiyoruz.api.pricing.domain.ZoneRateCard;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Yaka bazlı şehir içi taşıma ücreti (V22).
 *
 * <p>Taşımanın kendisini hesaplıyor — ek hizmetler ve komisyon bunun üstüne,
 * eskisi gibi {@link DefaultPricingService} tarafından ekleniyor. Bu ayrım
 * bilerek: hamaliye, asansörsüz kat ve bekleme şehirden şehre değişmiyor,
 * kilometre ücreti değişiyor.
 *
 * <p>Tarife bulunamazsa {@link Optional#empty()} dönüyor ve çağıran taraf eski
 * {@code rate_cards} yoluna düşüyor. Şehirlerarası taşıma, tarifesi girilmemiş
 * şehirler ve bu modelde karşılığı olmayan araçlar böyle çalışmaya devam ediyor —
 * yeni model eskiyi kaldırmıyor, önüne geçiyor.
 */
@Component
class ZonePricing {

    private final PricingZoneRepository zones;
    private final ZonePricingSettingsRepository settings;
    private final ZoneRateCardRepository cards;

    ZonePricing(PricingZoneRepository zones, ZonePricingSettingsRepository settings,
                ZoneRateCardRepository cards) {
        this.zones = zones;
        this.settings = settings;
        this.cards = cards;
    }

    /** Hesaplanan taşıma ücreti: dökümü ve toplamı. */
    record Fare(List<Quote.BreakdownLine> lines, BigDecimal total) {}

    /**
     * Bir senaryonun ücret parametreleri — tarife satırının hesaba giren kısmı.
     *
     * <p>Hesap, veritabanı satırından ayrı duruyor: fiyat kuralı bu dört sayıdan
     * ibaret ve öyle olduğu için tek başına, kurulum gerektirmeden sınanabiliyor.
     */
    record Rates(BigDecimal baseFare, BigDecimal perKmRate,
                 BigDecimal minimumFare, BigDecimal crossingFee) {}

    /** Eşiğin kendisi uzun sayılıyor: 24,9 km kısa, 25,0 km uzun. */
    static String distanceClass(BigDecimal distanceKm, BigDecimal shortDistanceKm) {
        return distanceKm.compareTo(shortDistanceKm) < 0 ? "SHORT" : "LONG";
    }

    /**
     * Rotanın taşıma ücreti. Sıra sabit ve önemli:
     * yaka → mesafe sınıfı → tarife → taban + km × ücret → kıta geçişi → minimum.
     *
     * @param distanceKm gerçek yol mesafesi. Negatifse rota katmanı bozuk demektir
     *                   ve sessizce fiyatlanmıyor; sıfır geçerli (aynı bina) ve
     *                   minimum ücrete düşüyor.
     * @param distanceNote mesafe satırına düşülecek not; takribî mesafede dolu.
     */
    Optional<Fare> transportFare(
            String cityCode,
            String vehicleTypeCode,
            String originDistrictSlug,
            String destinationDistrictSlug,
            BigDecimal distanceKm,
            String distanceNote) {

        if (distanceKm == null || distanceKm.signum() < 0) {
            throw new IllegalArgumentException("Mesafe hesaplanamadı: " + distanceKm);
        }

        var originZone = zones.findByCityCodeAndDistrictSlug(cityCode, originDistrictSlug);
        var destinationZone = zones.findByCityCodeAndDistrictSlug(cityCode, destinationDistrictSlug);
        // Yakası bilinmeyen ilçe eski tarifeye düşüyor. Tahmin etmek — örneğin
        // boylama bakmak — yanlış yakayı seçip 400 ₺'lik geçişi eksik ya da
        // fazla yazardı; sessiz bir fiyat hatası, açık bir eksikten kötüdür.
        if (originZone.isEmpty() || destinationZone.isEmpty()) return Optional.empty();

        var threshold = settings.findById(cityCode).map(s -> s.getShortDistanceKm());
        if (threshold.isEmpty()) return Optional.empty();

        var distanceClass = distanceClass(distanceKm, threshold.get());

        var card = cards
                .findFirstByCityCodeAndVehicleTypeCodeAndOriginZoneAndDestinationZoneAndDistanceClassAndActiveTrueOrderByVersionDesc(
                        cityCode, vehicleTypeCode, originZone.get().getZoneCode(),
                        destinationZone.get().getZoneCode(), distanceClass);
        if (card.isEmpty()) return Optional.empty();

        return Optional.of(fare(rates(card.get()), distanceKm, distanceNote,
                originZone.get().getZoneCode(), destinationZone.get().getZoneCode()));
    }

    private static Rates rates(ZoneRateCard card) {
        return new Rates(card.getBaseFare(), card.getPerKmRate(),
                card.getMinimumFare(), card.getCrossingFee());
    }

    /**
     * Taşıma ücretinin kendisi. Sıra prompt'taki gibi ve önemli:
     * taban + km × ücret → kıta geçişi → minimum.
     */
    static Fare fare(Rates rates, BigDecimal distanceKm, String distanceNote,
                     String originZone, String destinationZone) {
        var lines = new ArrayList<Quote.BreakdownLine>();

        lines.add(line("BASE_FARE", "Taban ücret", rates.baseFare(), null));

        var distanceCost = rates.perKmRate().multiply(distanceKm).setScale(2, RoundingMode.HALF_UP);
        lines.add(line("DISTANCE", "Mesafe (%s km)".formatted(tr(distanceKm)), distanceCost, distanceNote));

        // Kıta geçişi minimumdan ÖNCE ekleniyor: köprü ücreti taşımanın bir
        // parçası, minimumun eritebileceği bir ek hizmet değil.
        if (rates.crossingFee().signum() > 0) {
            lines.add(line("CROSSING", "Kıta geçişi", rates.crossingFee(),
                    "%s → %s".formatted(zoneName(originZone), zoneName(destinationZone))));
        }

        var subtotal = sum(lines);
        if (subtotal.compareTo(rates.minimumFare()) < 0) {
            lines.add(line("MINIMUM_FARE_ADJUSTMENT", "Minimum ücret farkı",
                    rates.minimumFare().subtract(subtotal), null));
            subtotal = rates.minimumFare();
        }

        return new Fare(List.copyOf(lines), subtotal);
    }

    private static String zoneName(String zoneCode) {
        return switch (zoneCode) {
            case "EUROPE" -> "Avrupa";
            case "ASIA" -> "Anadolu";
            default -> zoneCode;
        };
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
