package com.tasiyoruz.api.trustboard.internal;

import com.tasiyoruz.api.ordering.api.MarketplaceService;
import com.tasiyoruz.api.trustboard.api.PublicCorridorView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Hangi koridorlarda iş var — herkese açık, il düzeyinde, yalnızca sayı.
 *
 * <p><strong>Neden tek tek ilan değil:</strong> ADR-0008 devam eden siparişlerin
 * herkese açık gösterilmesini açıkça reddediyor. Açık bir ilanı yayınlamak
 * "şu anda şu semtteki şu ev boşaltılacak" demek; hiçbir gecikme bunu güvenli
 * yapmıyor. Aynı ADR toplu canlı sayaçları serbest bırakıyor, çünkü onlar kimseyi
 * tanımlamıyor. Bu uç ikisinin arasındaki güvenli yer: koridor başına sayı.
 *
 * <p>Eşik altındaki koridorlar hiç dönmüyor. Tek ilanı olan bir il çifti, o ilanın
 * kim olduğunu daraltmaya yarar; ADR'nin k-anonimlik kuralı bunu istiyor.
 */
@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Güven panosu")
class PublicCorridorsController {

    /**
     * Bir koridorun yayınlanması için gereken en az ilan sayısı.
     *
     * <p>ADR-0008 ilçe düzeyi için 5 diyor. Burası il düzeyi ve tekil taşıma değil
     * toplam; yine de tek ilanlık bir koridoru yayınlamak o ilanı işaret eder.
     */
    private static final int MIN_LISTINGS = 2;

    /** Ana sayfa uzun bir liste taşımıyor; en yoğun koridorlar yeterli. */
    private static final int MAX_CORRIDORS = 6;

    private final MarketplaceService marketplace;

    PublicCorridorsController(MarketplaceService marketplace) {
        this.marketplace = marketplace;
    }

    @GetMapping("/corridors")
    @Operation(summary = "Açık ilan bulunan koridorlar; il düzeyinde ve yalnızca sayı")
    // Sayaçlarla aynı gerekçe: her ana sayfa ziyareti çekirdek tablolara sorgu atmasın
    @Cacheable(cacheNames = "publicCorridors", cacheManager = "shortLivedCacheManager")
    public List<PublicCorridorView> corridors() {
        return marketplace.openCorridors().stream()
                .filter(c -> c.listingCount() >= MIN_LISTINGS)
                .limit(MAX_CORRIDORS)
                .map(c -> new PublicCorridorView(c.fromCity(), c.toCity(), c.listingCount()))
                .toList();
    }
}
