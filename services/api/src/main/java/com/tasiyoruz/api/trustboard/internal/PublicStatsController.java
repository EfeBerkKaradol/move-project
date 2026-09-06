package com.tasiyoruz.api.trustboard.internal;

import com.tasiyoruz.api.fleet.api.CarrierDirectory;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import com.tasiyoruz.api.trustboard.api.PublicStatsView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Ana sayfa sayaçları. Kimlik istemez (SecurityConfig: /api/v1/public/**). */
@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Güven panosu")
class PublicStatsController {

    private final MarketplaceService marketplace;
    private final CarrierDirectory carriers;

    PublicStatsController(MarketplaceService marketplace, CarrierDirectory carriers) {
        this.marketplace = marketplace;
        this.carriers = carriers;
    }

    @GetMapping("/stats")
    @Operation(summary = "Ana sayfa sayaçları; yetersiz veride alanlar boş döner")
    // 60 saniye: sayı canlı görünsün ama her ana sayfa ziyareti çekirdek tablolara
    // sorgu atmasın (docs/02 §3, güven panosunun varlık sebebi)
    @Cacheable(cacheNames = "publicStats", cacheManager = "shortLivedCacheManager")
    public PublicStatsView stats() {
        var average = marketplace.averageTimeToFirstOffer()
                .map(d -> (int) Math.max(1, d.toMinutes()))
                .orElse(null);
        return new PublicStatsView(marketplace.openListingCount(), carriers.approvedCarrierCount(), average);
    }
}
