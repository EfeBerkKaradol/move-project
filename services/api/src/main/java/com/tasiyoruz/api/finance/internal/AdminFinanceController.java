package com.tasiyoruz.api.finance.internal;

import com.tasiyoruz.api.finance.api.FinanceService;
import com.tasiyoruz.api.finance.api.ReconciliationResult;
import com.tasiyoruz.api.finance.api.ShipmentFinanceView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/**
 * Finans yönetimi. ROLE_FINANCE_ADMIN / ROLE_ADMIN (SecurityConfig).
 *
 * <p>Operasyon görevlisine kapalı: ciro, hakediş ve vergi bilgisi işin
 * yürütülmesi için gerekmiyor ve herkese açılmamalı.
 */
@RestController
@RequestMapping("/api/v1/admin/finance")
@Tag(name = "Finans (yönetim)")
class AdminFinanceController {

    private final FinanceService finance;

    AdminFinanceController(FinanceService finance) {
        this.finance = finance;
    }

    @GetMapping("/summary")
    @Operation(summary = "Ciro, platform geliri, taşıyıcı borcu ve mutabakat özeti")
    FinanceService.FinanceSummary summary() {
        return finance.summary();
    }

    @GetMapping("/shipments/{listingId}")
    @Operation(summary = "Bir taşımanın finansal özeti")
    ShipmentFinanceView shipment(@PathVariable String listingId) {
        return finance.shipmentFinance(listingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Finansal kayıt bulunamadı."));
    }

    @GetMapping("/shipments/{listingId}/transactions")
    @Operation(summary = "Taşımanın bütün para hareketleri, eskiden yeniye")
    List<FinanceService.TransactionView> transactions(@PathVariable String listingId) {
        return finance.transactions(listingId);
    }

    @GetMapping("/shipments/{listingId}/reconciliation")
    @Operation(summary = "Matematiksel tutarlılık kontrolü")
    ReconciliationResult reconciliation(@PathVariable String listingId) {
        return finance.reconcile(listingId);
    }
}
