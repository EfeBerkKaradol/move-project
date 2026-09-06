package com.tasiyoruz.api.fleet.internal;

import com.tasiyoruz.api.fleet.api.CarrierProfileView;
import com.tasiyoruz.api.fleet.api.CarrierService;
import com.tasiyoruz.api.fleet.api.ReviewDecision;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/** Operasyon onay kuyruğu (docs/01 FR-2.3, FR-13.3). ROLE_OPS_AGENT/ADMIN. */
@RestController
@RequestMapping("/api/v1/admin/carriers")
@Tag(name = "Taşıyıcı onay kuyruğu")
class CarrierReviewController {

    private final CarrierService carriers;

    CarrierReviewController(CarrierService carriers) {
        this.carriers = carriers;
    }

    @GetMapping("/pending")
    @Operation(summary = "İncelemedeki başvurular, en eski önce")
    List<CarrierProfileView> pending() {
        return carriers.pendingReview();
    }

    @PostMapping("/documents/{id}/review")
    @Operation(summary = "Tek belgeyi onayla ya da gerekçeyle reddet")
    CarrierProfileView reviewDocument(@PathVariable String id, @Valid @RequestBody ReviewDecision decision) {
        return carriers.reviewDocument(id, decision);
    }

    @GetMapping("/documents/{id}/file")
    @Operation(summary = "İncelenecek belge dosyası")
    ResponseEntity<InputStreamResource> download(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return CarrierController.fileResponse(carriers.download(jwt.getSubject(), true, id));
    }

    @PostMapping("/{carrierId}/review")
    @Operation(summary = "Başvuruyu sonuçlandır")
    CarrierProfileView reviewProfile(@PathVariable String carrierId, @Valid @RequestBody ReviewDecision decision) {
        return carriers.reviewProfile(carrierId, decision);
    }
}
