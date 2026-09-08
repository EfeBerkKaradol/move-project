package com.tasiyoruz.api.trustboard.internal;

import com.tasiyoruz.api.ordering.api.DeclaredItem;
import com.tasiyoruz.api.ordering.api.ListingView;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import com.tasiyoruz.api.trustboard.api.PublicListingView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Açık ilanlar — herkese açık.
 *
 * <p>Koridor sayaçları "bu hatta iş var" diyor ama ziyaretçiye işin neye benzediğini
 * göstermiyordu; araç sahibi adayı, kaydolmadan önce ürünün boş olmadığını görmek
 * istiyor. Bu uç ilanları tek tek yayınlıyor.
 *
 * <p><strong>Ne yayınlanmıyor:</strong> yükün fotoğrafı, açıklaması, kalem listesi,
 * kat ve asansör bilgisi, yük verenin kimliği. Bunlar teklif için gereken ayrıntılar
 * ve onaylı araç sahibine açılıyor. Yayınlanan şey rotanın kendisi: nereden nereye,
 * hangi araç, ne kadar büyük, tarife ne diyor.
 *
 * <p><strong>ADR-0008 ile ilişkisi:</strong> ADR "canlı, devam eden siparişleri"
 * herkese açık göstermeyi reddediyor — bir taşıma yürürken adresini yayınlamak
 * güvenlik riski. Buradaki kayıtlar henüz üstlenilmemiş <em>ilanlar</em>: ortada
 * ne atanmış araç ne başlamış bir iş var, kimsenin evinde o an kimse beklemiyor.
 * Kararı ürün verdi; sınır, üstlenilmiş işin hiçbir zaman burada görünmemesi.
 */
@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Güven panosu")
class PublicListingsController {

    /** Tek sayfada dönen en fazla ilan; liste sayfası bundan uzun olmuyor. */
    private static final int MAX_LISTINGS = 60;

    private final MarketplaceService marketplace;

    PublicListingsController(MarketplaceService marketplace) {
        this.marketplace = marketplace;
    }

    @GetMapping("/listings")
    @Operation(summary = "Açık ilanlar — rota, araç ve büyüklük; fotoğraf ve adres yok")
    @Cacheable(cacheNames = "publicListings", cacheManager = "shortLivedCacheManager")
    public List<PublicListingView> listings(@RequestParam(required = false) String vehicleType,
                                            @RequestParam(required = false) String city) {
        return marketplace.openListings(vehicleType, city).stream()
                .limit(MAX_LISTINGS)
                .map(PublicListingsController::view)
                .toList();
    }

    static PublicListingView view(ListingView l) {
        return new PublicListingView(
                l.id(),
                l.pickup().cityName(), l.pickup().districtName(), l.pickup().districtId(),
                l.dropoff().cityName(), l.dropoff().districtName(), l.dropoff().districtId(),
                l.vehicleTypeCode(),
                distanceKm(l),
                l.cargoItems().stream().mapToInt(DeclaredItem::quantity).sum(),
                l.declaredVolumeM3().setScale(1, RoundingMode.HALF_UP),
                l.estimatedAmount() == null ? BigDecimal.ZERO : l.estimatedAmount().amount(),
                l.offerCount(),
                l.serviceModel(),
                l.publishedAt(),
                l.expiresAt());
    }

    /** Tahmin zaten yaklaşık; metreyi yayınlamak olmayan bir kesinlik iddia ederdi. */
    private static int distanceKm(ListingView l) {
        var meters = l.estimate() == null ? null : l.estimate().get("distanceMeters");
        return meters instanceof Number n ? Math.round(n.floatValue() / 1000f) : 0;
    }
}
