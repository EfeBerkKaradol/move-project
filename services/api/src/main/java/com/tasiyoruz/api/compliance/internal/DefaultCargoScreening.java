package com.tasiyoruz.api.compliance.internal;

import com.tasiyoruz.api.compliance.api.CargoScreening;
import com.tasiyoruz.api.compliance.api.ComplianceEventType;
import com.tasiyoruz.api.compliance.api.Severity;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** İlan beyanının taranması ve gerekiyorsa incelemeye alınması. */
@Service
@Transactional
class DefaultCargoScreening implements CargoScreening {

    /** Kullanıcının "yakın geçmişi" — risk girdisi olarak bu pencereye bakılıyor. */
    private static final Duration RECENT_WINDOW = Duration.ofDays(90);

    private final ProhibitedItemScanner scanner;
    private final RiskEngine risk;
    private final DefaultComplianceEvents events;
    private final ComplianceReportRepository reports;
    private final Clock clock;

    DefaultCargoScreening(ProhibitedItemScanner scanner, RiskEngine risk, DefaultComplianceEvents events,
                          ComplianceReportRepository reports, Clock clock) {
        this.scanner = scanner;
        this.risk = risk;
        this.events = events;
        this.reports = reports;
        this.clock = clock;
    }

    @Override
    public void screenListing(String userId, String listingId, String cargoDescription, List<String> itemNames) {
        var texts = Stream.concat(Stream.of(cargoDescription), itemNames.stream()).toArray(String[]::new);
        var matches = scanner.scan(texts);

        var openReports = reports.countBySubjectRefAndStatusIn(listingId, List.of("OPEN", "UNDER_REVIEW"));
        var recentEvents = events.recentEventCount(userId, Instant.now(clock).minus(RECENT_WINDOW));

        var assessment = risk.assess(matches, openReports, recentEvents);
        if (!assessment.needsReview()) return;

        var signals = new java.util.LinkedHashMap<>(assessment.signals());
        signals.put("riskScore", assessment.score());

        events.raise(
                matches.isEmpty() ? ComplianceEventType.SUSPICIOUS_TRANSACTION : ComplianceEventType.PROHIBITED_ITEM,
                matches.isEmpty() ? Severity.MEDIUM : Severity.HIGH,
                userId, listingId,
                "İlan beyanı otomatik taramada işaretlendi; insan incelemesi gerekiyor.",
                signals);
    }
}
