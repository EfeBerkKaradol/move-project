package com.tasiyoruz.api.trustboard.internal;

import com.tasiyoruz.api.fleet.api.CarrierDirectory;
import com.tasiyoruz.api.trustboard.api.PublicFleetCountView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Comparator;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Araç tipi başına kayıtlı taşıyıcı sayısı — herkese açık.
 *
 * <p>"Şu kadar panelvan, şu kadar kamyon kayıtlı" iddiası araçlar sayfasının
 * çekirdeği: ziyaretçi filonun gerçekten var olduğunu görmeden teklif beklemez.
 *
 * <p><strong>ADR-0008 ile ilişkisi:</strong> burada yayınlanan şey ulusal ve
 * toplulaştırılmış bir sayı. ADR'nin koruduğu şey tekil taşımanın nerede olduğu;
 * "Türkiye'de kaç panelvan kayıtlı" hiç kimseyi işaret etmiyor. Konum, plaka ve
 * kimlik bu uçtan geçmiyor.
 */
@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Güven panosu")
class PublicFleetController {

    private final CarrierDirectory carriers;

    PublicFleetController(CarrierDirectory carriers) {
        this.carriers = carriers;
    }

    @GetMapping("/fleet-counts")
    @Operation(summary = "Araç tipi başına doğrulanmış taşıyıcı sayısı")
    // Sayaçlarla aynı gerekçe: her ziyaret çekirdek tabloya sorgu atmasın
    @Cacheable(cacheNames = "publicFleetCounts", cacheManager = "shortLivedCacheManager")
    public List<PublicFleetCountView> counts() {
        return carriers.approvedCountByVehicleType().entrySet().stream()
                .map(e -> new PublicFleetCountView(e.getKey(), e.getValue()))
                // Sıra deterministik olsun: aynı sayıda iki tip her istekte yer
                // değiştirseydi sayfa kendi kendine oynuyor görünürdü
                .sorted(Comparator.comparingLong(PublicFleetCountView::carrierCount).reversed()
                        .thenComparing(PublicFleetCountView::vehicleTypeCode))
                .toList();
    }
}
