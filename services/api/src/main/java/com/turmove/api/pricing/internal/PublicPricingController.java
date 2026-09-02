package com.turmove.api.pricing.internal;

import com.turmove.api.pricing.api.Quote;
import com.turmove.api.pricing.api.QuoteRequest;
import com.turmove.api.pricing.api.PricingService;
import com.turmove.api.pricing.domain.ExtraService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Fiyatlandırma", description = "Teklif hesaplama ve ek hizmetler")
class PublicPricingController {

    private final PricingService pricingService;
    private final ExtraServiceRepository extraServices;

    PublicPricingController(PricingService pricingService, ExtraServiceRepository extraServices) {
        this.pricingService = pricingService;
        this.extraServices = extraServices;
    }

    @GetMapping("/extra-services")
    @Operation(summary = "Seçilebilir ek hizmetler ve ücretleri")
    List<ExtraService> extraServices() {
        return extraServices.findByActiveTrueOrderBySortOrderAsc();
    }

    @PostMapping("/quotes")
    @Operation(summary = "Fiyat teklifi hesaplar — kimlik gerektirmez")
    Quote quote(@Valid @RequestBody QuoteRequest request) {
        return pricingService.quote(request);
    }
}
