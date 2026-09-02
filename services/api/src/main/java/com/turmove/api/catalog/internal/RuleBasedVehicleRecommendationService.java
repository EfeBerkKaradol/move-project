package com.turmove.api.catalog.internal;

import com.turmove.api.catalog.api.*;
import com.turmove.api.catalog.domain.CargoItem;
import com.turmove.api.catalog.domain.VehicleType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Kural tabanlı araç öneri motoru (ADR-0007).
 *
 * <p>Hacim, ağırlık ve en uzun kenar hesaplanır; üç kısıtı da sağlayan <em>en küçük</em>
 * araç önerilir — en küçük uygun araç aynı zamanda en ucuzudur. Her öneri, bir alt aracın
 * neden yetmediğinin açıklamasıyla birlikte döner.
 */
@Service
class RuleBasedVehicleRecommendationService implements VehicleRecommendationService {

    /** İstifleme payı: eşyalar kasaya mükemmel yerleşmez. */
    private static final BigDecimal PACKING_FACTOR = new BigDecimal("1.25");

    /** Ağırlık payı: beyan edilmeyen küçük kalemler. */
    private static final BigDecimal WEIGHT_FACTOR = new BigDecimal("1.05");

    /** Bu ağırlığın üstündeki tek eşya için hamaliye önerilir. */
    private static final int PORTERAGE_ITEM_WEIGHT_KG = 60;

    private static final BigDecimal PORTERAGE_VOLUME_M3 = new BigDecimal("3.0");

    private final VehicleTypeRepository vehicleTypes;
    private final CargoItemRepository cargoItems;
    private final CargoPresetRepository presets;
    private final CargoCategoryRepository categories;

    RuleBasedVehicleRecommendationService(
            VehicleTypeRepository vehicleTypes,
            CargoItemRepository cargoItems,
            CargoPresetRepository presets,
            CargoCategoryRepository categories) {
        this.vehicleTypes = vehicleTypes;
        this.cargoItems = cargoItems;
        this.presets = presets;
        this.categories = categories;
    }

    @Override
    public VehicleRecommendation recommend(CargoDeclarationRequest request) {
        var estimate = estimate(request);
        var fleet = activeFleet();

        var suitable = fleet.stream()
                .filter(v -> v.canCarry(estimate.volumeM3(), estimate.weightKg(), estimate.longestEdgeCm()))
                .toList();

        if (suitable.isEmpty()) {
            throw new NoSuitableVehicleException(estimate);
        }

        var primaryType = suitable.getFirst(); // fleet sortOrder'a göre sıralı: en küçük önce
        var primary = toOption(primaryType, estimate, smallerThan(fleet, primaryType), true);

        var alternatives = suitable.stream()
                .skip(1)
                .limit(2)
                .map(v -> toOption(v, estimate, null, false))
                .toList();

        return new VehicleRecommendation(estimate, primary, alternatives, suggestExtras(request, estimate));
    }

    // --- tahmin ---

    private VehicleRecommendation.Estimate estimate(CargoDeclarationRequest request) {
        if (request.presetCode() != null) {
            var preset = presets.findById(request.presetCode())
                    .orElseThrow(() -> new IllegalArgumentException("Bilinmeyen preset: " + request.presetCode()));
            return new VehicleRecommendation.Estimate(
                    preset.getEstimatedVolumeM3(),
                    preset.getEstimatedWeightKg(),
                    preset.getEstimatedLongestEdgeCm());
        }

        var catalog = catalogByCode();
        var rawVolume = BigDecimal.ZERO;
        var rawWeight = 0;
        var longestEdge = 0;

        for (var line : request.itemsOrEmpty()) {
            var item = catalog.get(line.cargoItemCode());
            if (item == null) {
                throw new IllegalArgumentException("Bilinmeyen eşya: " + line.cargoItemCode());
            }
            rawVolume = rawVolume.add(item.getVolumeM3().multiply(BigDecimal.valueOf(line.quantity())));
            rawWeight += item.getWeightKg() * line.quantity();
            longestEdge = Math.max(longestEdge, item.getLongestEdgeCm());
        }

        if (request.packageCount() != null && request.packageCount() > 0) {
            // Paket boyutu kategoriye bağlı: "3 zarf" ile "3 taşınma kolisi" aynı hacim değil
            var packageItem = packageItemFor(request.categoryCode(), catalog);
            rawVolume = rawVolume.add(
                    packageItem.getVolumeM3().multiply(BigDecimal.valueOf(request.packageCount())));
            rawWeight += packageItem.getWeightKg() * request.packageCount();
            longestEdge = Math.max(longestEdge, packageItem.getLongestEdgeCm());
        }

        var volume = rawVolume.multiply(PACKING_FACTOR).setScale(2, RoundingMode.HALF_UP);
        var weight = BigDecimal.valueOf(rawWeight).multiply(WEIGHT_FACTOR).setScale(0, RoundingMode.HALF_UP).intValue();
        return new VehicleRecommendation.Estimate(volume, weight, longestEdge);
    }

    // --- öneri oluşturma ---

    private VehicleRecommendation.Option toOption(
            VehicleType type,
            VehicleRecommendation.Estimate estimate,
            VehicleType smaller,
            boolean isPrimary) {

        var reason = isPrimary
                ? "Yükünüz %s m³ ve en uzun parça %d cm."
                        .formatted(tr(estimate.volumeM3()), estimate.longestEdgeCm())
                : "Daha rahat yükleme, ek boşluk.";

        return new VehicleRecommendation.Option(
                type.getCode(),
                type.getDisplayName(),
                type.fillRatePercent(estimate.volumeM3()),
                reason,
                smaller == null ? null : whyNotSmaller(smaller, estimate));
    }

    /**
     * Bir alt aracın neden yetmediğini açıklar. Kullanıcı bu cümleyi görmezse daha
     * ucuzunu seçer ve iş bozulur — açıklama öneri kadar önemli.
     */
    private VehicleRecommendation.WhyNotSmaller whyNotSmaller(
            VehicleType smaller, VehicleRecommendation.Estimate estimate) {

        // Araç adları yabancı kökenli (Doblo, Transporter, Transit) ve Türkçe iyelik
        // ekinde ünlü uyumu belirsiz kalıyor. Eki hiç kullanmayıp parantezle veriyoruz —
        // hem her araç adı için doğru hem daha okunur.
        String reason;
        if (smaller.getInnerLengthCm() < estimate.longestEdgeCm()) {
            reason = "%d cm'lik parça, %s kasasına (%d cm) sığmıyor."
                    .formatted(estimate.longestEdgeCm(), smaller.getDisplayName(), smaller.getInnerLengthCm());
        } else if (smaller.getPayloadKg() < estimate.weightKg()) {
            reason = "%d kg yük, %s kapasitesini (%d kg) aşıyor."
                    .formatted(estimate.weightKg(), smaller.getDisplayName(), smaller.getPayloadKg());
        } else {
            reason = "%s m³ yük, %s kasasına (%s m³) sığmıyor."
                    .formatted(tr(estimate.volumeM3()), smaller.getDisplayName(), tr(smaller.getVolumeM3()));
        }
        return new VehicleRecommendation.WhyNotSmaller(smaller.getCode(), reason);
    }

    private List<VehicleRecommendation.SuggestedExtra> suggestExtras(
            CargoDeclarationRequest request, VehicleRecommendation.Estimate estimate) {

        var extras = new ArrayList<VehicleRecommendation.SuggestedExtra>();
        var catalog = catalogByCode();

        var heaviest = request.itemsOrEmpty().stream()
                .map(line -> catalog.get(line.cargoItemCode()))
                .filter(Objects::nonNull)
                .max(Comparator.comparingInt(CargoItem::getWeightKg));

        var noElevatorUpstairs = request.stopsOrEmpty().stream()
                .anyMatch(s -> s.floor() != null && s.floor() > 1 && Boolean.FALSE.equals(s.hasElevator()));

        if (noElevatorUpstairs && heaviest.isPresent()) {
            extras.add(new VehicleRecommendation.SuggestedExtra(
                    "PORTERAGE",
                    "%s %d kg, asansör yok."
                            .formatted(heaviest.get().getDisplayName(), heaviest.get().getWeightKg())));
        } else if (heaviest.filter(i -> i.getWeightKg() >= PORTERAGE_ITEM_WEIGHT_KG).isPresent()
                || estimate.volumeM3().compareTo(PORTERAGE_VOLUME_M3) > 0) {
            extras.add(new VehicleRecommendation.SuggestedExtra(
                    "PORTERAGE", "Ağır ve hacimli yük için yükleme desteği önerilir."));
        }

        if ("INSAAT".equals(request.categoryCode())) {
            extras.add(new VehicleRecommendation.SuggestedExtra(
                    "TARPAULIN", "İnşaat malzemesi için branda önerilir."));
        }
        return extras;
    }

    // --- yardımcılar ---

    /**
     * Katalog çok okunup az yazılıyor; öneri motorunun &lt;100 ms hedefi buna dayanıyor.
     * Katalog değişince cache invalidate edilir.
     */
    @Cacheable("vehicleTypes")
    List<VehicleType> activeFleet() {
        return vehicleTypes.findByActiveTrueOrderBySortOrderAsc();
    }

    private Map<String, CargoItem> catalogByCode() {
        return cargoItems.findByActiveTrueOrderBySortOrderAsc().stream()
                .collect(java.util.stream.Collectors.toMap(CargoItem::getCode, i -> i));
    }

    /** Türkçe ondalık ayracı virgüldür: 2.64 → "2,64". */
    private static String tr(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString().replace('.', ',');
    }

    private CargoItem packageItemFor(String categoryCode, Map<String, CargoItem> catalog) {
        var code = categories.findById(categoryCode)
                .map(c -> c.getDefaultPackageItemCode())
                .orElse(null);
        if (code == null) {
            code = "KOLI_STANDART";
        }
        var item = catalog.get(code);
        if (item == null) {
            throw new IllegalStateException("Katalogda paket kalemi bulunamadı: " + code);
        }
        return item;
    }

    private VehicleType smallerThan(List<VehicleType> fleet, VehicleType type) {
        VehicleType previous = null;
        for (var candidate : fleet) {
            if (candidate.getCode().equals(type.getCode())) {
                return previous;
            }
            previous = candidate;
        }
        return null;
    }
}
