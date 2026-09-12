package com.tasiyoruz.api.finance.internal;

import com.tasiyoruz.api.finance.api.FinanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Taşıyıcının kendi hakedişleri. ROLE_DRIVER (SecurityConfig).
 *
 * <p>Kimlik yoldan değil token'dan okunuyor: taşıyıcı kimliği parametre olarak
 * alınsaydı biri başkasının hakedişini isteyebilirdi.
 */
@RestController
@RequestMapping("/api/v1/driver/payouts")
@Tag(name = "Hakediş (araç sahibi)")
class DriverPayoutController {

    private final FinanceService finance;

    DriverPayoutController(FinanceService finance) {
        this.finance = finance;
    }

    @GetMapping
    @Operation(summary = "Kendi hakedişlerim; en yeniden eskiye")
    List<FinanceService.PayoutView> mine(@AuthenticationPrincipal Jwt jwt) {
        return finance.payoutsOfCarrier(jwt.getSubject());
    }
}
