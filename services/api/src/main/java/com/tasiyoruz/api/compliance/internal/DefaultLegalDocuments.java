package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.LegalDocType;
import com.tasiyoruz.api.compliance.api.LegalDocumentView;
import com.tasiyoruz.api.compliance.api.LegalDocuments;
import com.tasiyoruz.api.compliance.domain.LegalDocument;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Yürürlükteki belgeler.
 *
 * <p>Kabul edilmesi beklenen belgeler role göre değişiyor: herkes kullanıcı
 * sözleşmesini kabul ediyor, araç sahibi ayrıca taşıyıcı sözleşmesini. Aydınlatma
 * metni kabul edilmiyor, gösteriliyor — o yüzden bekleyenler listesinde yok.
 */
@Service
@Transactional(readOnly = true)
class DefaultLegalDocuments implements LegalDocuments {

    /** Her kullanıcının kabul etmesi gerekenler. */
    private static final List<LegalDocType> REQUIRED_FOR_ALL = List.of(LegalDocType.USER_TERMS);

    /** Araç sahibi ek olarak bunu kabul ediyor. */
    private static final List<LegalDocType> REQUIRED_FOR_CARRIER = List.of(LegalDocType.CARRIER_TERMS);

    private final LegalDocumentRepository documents;
    private final ConsentRecordRepository consents;

    DefaultLegalDocuments(LegalDocumentRepository documents, ConsentRecordRepository consents) {
        this.documents = documents;
        this.consents = consents;
    }

    @Override
    public List<LegalDocumentView> active() {
        return documents.findByActiveTrueOrderByDocTypeAsc().stream().map(DefaultLegalDocuments::view).toList();
    }

    @Override
    public Optional<LegalDocumentView> active(LegalDocType docType) {
        return documents.findByDocTypeAndActiveTrue(docType).map(DefaultLegalDocuments::view);
    }

    @Override
    public Optional<LegalDocumentView> bySlug(String slug) {
        return documents.findBySlugAndActiveTrue(slug).map(DefaultLegalDocuments::view);
    }

    @Override
    public List<LegalDocumentView> pendingFor(String userId, boolean carrier) {
        var required = new java.util.ArrayList<>(REQUIRED_FOR_ALL);
        if (carrier) required.addAll(REQUIRED_FOR_CARRIER);

        return required.stream()
                .map(documents::findByDocTypeAndActiveTrue)
                .flatMap(Optional::stream)
                // Sürüm karşılaştırması şart: eski sürümü kabul etmiş kullanıcı,
                // esaslı değişiklik sonrası yeniden kabul akışına girmeli
                .filter(d -> !consents.hasAccepted(userId, d.getDocType(), d.getVersion()))
                .map(DefaultLegalDocuments::view)
                .toList();
    }

    static LegalDocumentView view(LegalDocument d) {
        return new LegalDocumentView(d.getDocType(), d.getVersion(), d.getTitle(), d.getSlug(),
                d.getEffectiveAt(), d.isRequiresReacceptance());
    }
}
