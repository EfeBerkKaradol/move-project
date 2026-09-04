package com.turmove.api.catalog.internal;

import com.turmove.api.catalog.api.CargoDeclarationRequest;
import com.turmove.api.catalog.api.CargoPresetView;
import com.turmove.api.catalog.api.VehicleRecommendation;
import com.turmove.api.catalog.api.VehicleRecommendationService;
import com.turmove.api.catalog.domain.CargoCategory;
import com.turmove.api.catalog.domain.CargoItem;
import com.turmove.api.catalog.domain.VehicleType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

/**
 * Katalog ve araç önerisi — kimlik gerektirmeyen uçlar.
 *
 * <p>Kullanıcı fiyat almadan ve kayıt olmadan önce buradan geçiyor; akışın en
 * başındaki bu adımın hızlı ve açık olması dönüşümü doğrudan etkiliyor.
 */
@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Katalog", description = "Araç tipleri, yük kategorileri ve araç önerisi")
class PublicCatalogController {

    private final VehicleTypeRepository vehicleTypes;
    private final CargoCategoryRepository categories;
    private final CargoItemRepository cargoItems;
    private final CargoPresetRepository presets;
    private final VehicleRecommendationService recommendationService;

    PublicCatalogController(
            VehicleTypeRepository vehicleTypes,
            CargoCategoryRepository categories,
            CargoItemRepository cargoItems,
            CargoPresetRepository presets,
            VehicleRecommendationService recommendationService) {
        this.vehicleTypes = vehicleTypes;
        this.categories = categories;
        this.cargoItems = cargoItems;
        this.presets = presets;
        this.recommendationService = recommendationService;
    }

    @GetMapping("/vehicle-types")
    @Operation(summary = "Araç filosu ve kapasiteleri — hizmete açılmamışlar dahil")
    List<VehicleType> vehicleTypes() {
        // Hizmete açılmamış araçlar da dönüyor: arayüz onları "Yakında" rozetiyle
        // gösteriyor, böylece kullanıcı filonun tamamını görüyor. Öneri motoru
        // yalnızca aktif olanları değerlendiriyor (CatalogCache.activeFleet).
        return vehicleTypes.findAllByOrderBySortOrderAsc();
    }

    @GetMapping("/cargo-categories")
    @Operation(summary = "Yük kategorileri — küçükten büyüğe sıralı")
    List<CargoCategory> cargoCategories() {
        return categories.findByActiveTrueOrderBySortOrderAsc();
    }

    @GetMapping("/cargo-items")
    @Operation(summary = "Eşya kataloğu")
    List<CargoItem> cargoItems(@RequestParam(required = false) String category) {
        return category == null
                ? cargoItems.findByActiveTrueOrderBySortOrderAsc()
                : cargoItems.findByCategoryCodeAndActiveTrueOrderBySortOrderAsc(category);
    }

    @GetMapping("/cargo-presets")
    @Operation(summary = "Kategori bazlı hazır tahminler (2+1 orta, stüdyo az eşya…)")
    List<CargoPresetView> cargoPresets(@RequestParam(required = false) String category) {
        var rows = category == null
                ? presets.findAllByOrderBySortOrderAsc()
                : presets.findByCategoryCodeOrderBySortOrderAsc(category);
        return rows.stream()
                .map(p -> new CargoPresetView(
                        p.getCode(),
                        p.getCategoryCode(),
                        p.getDisplayName(),
                        p.getEstimatedVolumeM3(),
                        p.getEstimatedWeightKg(),
                        p.getSortOrder()))
                .toList();
    }

    @PostMapping("/vehicle-recommendation")
    @Operation(summary = "Yük beyanından araç önerisi üretir")
    VehicleRecommendation recommend(@Valid @RequestBody CargoDeclarationRequest request) {
        return recommendationService.recommend(request);
    }
}
