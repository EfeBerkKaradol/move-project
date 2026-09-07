package com.tasiyoruz.api.admin.internal;

import com.tasiyoruz.api.admin.api.OverviewView;
import com.tasiyoruz.api.fleet.api.CarrierProfileView;
import com.tasiyoruz.api.fleet.api.CarrierService;
import com.tasiyoruz.api.fleet.api.CarrierStatus;
import com.tasiyoruz.api.fleet.api.ExpiringDocumentView;
import com.tasiyoruz.api.notification.api.NotificationLog;
import com.tasiyoruz.api.notification.api.NotificationView;
import com.tasiyoruz.api.ordering.api.ListingStatus;
import com.tasiyoruz.api.ordering.api.ListingView;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import com.tasiyoruz.api.ordering.api.OfferView;
import com.tasiyoruz.api.tracking.api.TripService;
import com.tasiyoruz.api.tracking.api.TripView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.web.bind.annotation.*;

/**
 * Operasyon panelinin okuma ve müdahale uçları. ROLE_OPS_AGENT / ROLE_ADMIN
 * (SecurityConfig).
 *
 * <p>Taşıyıcı belge incelemesi ayrı bir denetleyicide (fleet modülü), çünkü belge
 * akışının kuralları oraya ait.
 */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Operasyon paneli")
class AdminController {

    private final OverviewService overview;
    private final MarketplaceService marketplace;
    private final TripService trips;
    private final CarrierService carriers;
    private final NotificationLog notifications;

    AdminController(OverviewService overview, MarketplaceService marketplace, TripService trips,
                    CarrierService carriers, NotificationLog notifications) {
        this.overview = overview;
        this.marketplace = marketplace;
        this.trips = trips;
        this.carriers = carriers;
        this.notifications = notifications;
    }

    @GetMapping("/notifications")
    @Operation(summary = "Son bildirimler; gitmeyen postalar hatasıyla görünür")
    List<NotificationView> notifications(@RequestParam(defaultValue = "100") int limit,
                                         @RequestParam(required = false) String recipientId) {
        return recipientId == null ? notifications.recent(limit) : notifications.forRecipient(recipientId);
    }

    @GetMapping("/overview")
    @Operation(summary = "Pano sayıları")
    OverviewView overview() {
        return overview.overview();
    }

    @GetMapping("/listings")
    @Operation(summary = "İlanlar; durum ile süzülebilir")
    List<ListingView> listings(@RequestParam(required = false) ListingStatus status) {
        return marketplace.allListings(status);
    }

    @GetMapping("/listings/{id}/offers")
    List<OfferView> offers(@PathVariable String id) {
        var listing = marketplace.listing(id).orElseThrow();
        return marketplace.offersForListing(listing.shipperId(), id);
    }

    @PostMapping("/listings/{id}/cancel")
    @Operation(summary = "İlanı operasyon kararıyla kapat; gerekçe zorunlu")
    ListingView cancelListing(@PathVariable String id, @Valid @RequestBody ReasonRequest request) {
        return marketplace.cancelAsOperations(id, request.reason());
    }

    @GetMapping("/trips")
    @Operation(summary = "Tüm işler, en yeni önce")
    List<TripView> trips() {
        return trips.allTrips();
    }

    @GetMapping("/carriers")
    @Operation(summary = "Taşıyıcı başvuruları; durum ile süzülebilir")
    List<CarrierProfileView> carriers(@RequestParam(required = false) CarrierStatus status) {
        return carriers.carriers(status);
    }

    @GetMapping("/carriers/expiring-documents")
    @Operation(summary = "Süresi yaklaşan onaylı belgeler, en yakın önce (FR-2.4)")
    List<ExpiringDocumentView> expiringDocuments(@RequestParam(defaultValue = "30") int days) {
        return carriers.documentsExpiringWithin(Math.min(Math.max(days, 1), 365));
    }

    @PostMapping("/carriers/{carrierId}/suspend")
    @Operation(summary = "Taşıyıcıyı askıya al; iş alması durur")
    CarrierProfileView suspend(@PathVariable String carrierId, @Valid @RequestBody ReasonRequest request) {
        return carriers.suspend(carrierId, request.reason());
    }

    @PostMapping("/carriers/{carrierId}/reactivate")
    @Operation(summary = "Askıyı kaldır; belgeler hâlâ geçerli olmalı")
    CarrierProfileView reactivate(@PathVariable String carrierId) {
        return carriers.reactivate(carrierId);
    }

    /** Gerekçe her müdahalede zorunlu: kayıt tutulmayan operasyon kararı denetlenemez. */
    record ReasonRequest(@NotBlank @Size(max = 500) String reason) {}
}
