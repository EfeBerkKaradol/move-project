package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.LegalDocumentView;
import com.tasiyoruz.api.compliance.api.LegalDocuments;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Yürürlükteki hukuki belgelerin künyesi — herkese açık.
 *
 * <p>Metnin kendisi web tarafında (depodaki dosyalarda); buradan dönen sürüm ve
 * yürürlük tarihi, sayfanın başlığında gösteriliyor ve rıza kaydına yazılıyor.
 */
@RestController
@RequestMapping("/api/v1/public/legal-documents")
@Tag(name = "Hukuki belgeler")
class PublicLegalController {

    private final LegalDocuments documents;

    PublicLegalController(LegalDocuments documents) {
        this.documents = documents;
    }

    @GetMapping
    @Operation(summary = "Yürürlükteki belgeler ve sürümleri")
    List<LegalDocumentView> all() {
        return documents.active();
    }

    @GetMapping("/{slug}")
    LegalDocumentView one(@PathVariable String slug) {
        return documents.bySlug(slug).orElseThrow(() -> ComplianceExceptions.notFound("Belge"));
    }
}
