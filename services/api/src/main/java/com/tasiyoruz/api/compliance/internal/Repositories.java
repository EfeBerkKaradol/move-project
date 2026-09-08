package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.ConsentType;
import com.tasiyoruz.api.compliance.api.LegalDocType;
import com.tasiyoruz.api.compliance.domain.*;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/**
 * Uyum modülünün depoları tek dosyada.
 *
 * <p>Yedi küçük arayüzü yedi dosyaya dağıtmak, hiçbirine bakmadan anlaşılabilecek
 * bir modülü yedi kez açtırıyordu; hepsi aynı sınırın içinde ve birlikte okunuyor.
 */
final class Repositories {
    private Repositories() {}
}

interface LegalDocumentRepository extends JpaRepository<LegalDocument, UUID> {
    List<LegalDocument> findByActiveTrueOrderByDocTypeAsc();
    Optional<LegalDocument> findByDocTypeAndActiveTrue(LegalDocType docType);
    Optional<LegalDocument> findBySlugAndActiveTrue(String slug);
}

interface ConsentRecordRepository extends JpaRepository<ConsentRecord, UUID> {

    List<ConsentRecord> findByUserIdAndConsentTypeOrderByCreatedAtDesc(String userId, ConsentType type, Limit limit);

    List<ConsentRecord> findByUserIdOrderByCreatedAtDesc(String userId);

    List<ConsentRecord> findBySubjectRefOrderByCreatedAtAsc(String subjectRef);

    /** Geri çekilmemiş, kabul edilmiş kayıtlar — geri çekme işlemi bunları damgalıyor. */
    List<ConsentRecord> findByUserIdAndConsentTypeAndAcceptedTrueAndWithdrawnAtIsNull(String userId, ConsentType type);

    @Query("""
            select count(c) > 0 from ConsentRecord c
            where c.userId = ?1 and c.docType = ?2 and c.docVersion = ?3
              and c.accepted = true and c.withdrawnAt is null
            """)
    boolean hasAccepted(String userId, LegalDocType docType, String version);
}

interface AccountStatusRepository extends JpaRepository<AccountStatusRecord, String> {
    List<AccountStatusRecord> findByStatusInOrderByChangedAtDesc(List<com.tasiyoruz.api.compliance.api.AccountStatus> statuses);
}

interface ComplianceEventRepository extends JpaRepository<ComplianceEvent, UUID> {
    List<ComplianceEvent> findByStatusInOrderBySeverityDescCreatedAtDesc(List<String> statuses);
    List<ComplianceEvent> findByUserIdOrderByCreatedAtDesc(String userId);
    List<ComplianceEvent> findBySubjectRefOrderByCreatedAtDesc(String subjectRef);
    long countByStatusIn(List<String> statuses);
    long countByUserIdAndCreatedAtAfter(String userId, Instant since);
}

interface ComplianceReportRepository extends JpaRepository<ComplianceReport, UUID> {
    List<ComplianceReport> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
    List<ComplianceReport> findAllByOrderByCreatedAtDesc(Limit limit);
    long countBySubjectRefAndStatusIn(String subjectRef, List<String> statuses);
    long countByReportedUserId(String reportedUserId);
    boolean existsByReporterIdAndSubjectRefAndCategory(String reporterId, String subjectRef, String category);
}

interface AuditEntryRepository extends JpaRepository<AuditEntry, Long> {
    List<AuditEntry> findBySubjectTypeAndSubjectRefOrderByCreatedAtDesc(String subjectType, String subjectRef);
    List<AuditEntry> findAllByOrderByCreatedAtDesc(Limit limit);
}

interface DataRequestRepository extends JpaRepository<DataRequest, UUID> {
    List<DataRequest> findByUserIdOrderByCreatedAtDesc(String userId);
    List<DataRequest> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
}
