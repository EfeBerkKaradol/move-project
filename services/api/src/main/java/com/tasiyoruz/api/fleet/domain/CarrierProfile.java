package com.tasiyoruz.api.fleet.domain;

import com.tasiyoruz.api.fleet.api.CarrierStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Taşıyıcı başvurusu. Durum geçişleri yalnızca bu sınıftaki metotlarla yapılır. */
@Entity
@Table(name = "carrier_profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CarrierProfile {

    @Id @GeneratedValue private UUID id;
    @Column(nullable = false, unique = true, length = 64) private String carrierId;
    @Column(nullable = false, length = 120) private String displayName;
    @Column(length = 32) private String phone;
    @Column(length = 160) private String companyName;
    @Column(length = 20) private String taxId;
    @Column(nullable = false, length = 32) private String vehicleTypeCode;
    @Column(nullable = false, length = 16) private String plate;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24)
    private CarrierStatus status;

    private Instant submittedAt;
    private Instant reviewedAt;
    @Column(columnDefinition = "text") private String reviewNote;
    @Column(nullable = false) private Instant createdAt;

    /** İnceleme ile taşıyıcının düzenlemesi yarışırsa ikinci yazan kaybetsin. */
    @Version @Column(nullable = false) private int version;

    @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<CarrierDocument> documents = new ArrayList<>();

    public static CarrierProfile open(String carrierId, String displayName, String phone, String companyName,
                                      String taxId, String vehicleTypeCode, String plate, Instant now) {
        var p = new CarrierProfile();
        p.carrierId = carrierId;
        p.status = CarrierStatus.DRAFT;
        p.createdAt = now;
        p.apply(displayName, phone, companyName, taxId, vehicleTypeCode, plate);
        return p;
    }

    void apply(String displayName, String phone, String companyName, String taxId,
               String vehicleTypeCode, String plate) {
        this.displayName = displayName;
        this.phone = phone;
        this.companyName = blankToNull(companyName);
        this.taxId = blankToNull(taxId);
        this.vehicleTypeCode = vehicleTypeCode;
        this.plate = plate.toUpperCase(java.util.Locale.forLanguageTag("tr")).replace(" ", "");
    }

    void submit(Instant now) {
        this.status = CarrierStatus.PENDING_REVIEW;
        this.submittedAt = now;
        this.reviewNote = null;
    }

    void approve(String note, Instant now) {
        this.status = CarrierStatus.APPROVED;
        this.reviewedAt = now;
        this.reviewNote = note;
    }

    void reject(String reason, Instant now) {
        this.status = CarrierStatus.REJECTED;
        this.reviewedAt = now;
        this.reviewNote = reason;
    }

    void suspend(String reason, Instant now) {
        this.status = CarrierStatus.SUSPENDED;
        this.reviewedAt = now;
        this.reviewNote = reason;
    }

    /**
     * Belgeye dokunulunca başvuru taslağa döner.
     *
     * <p>Onaylı bir taşıyıcı belgesini değiştirip onaylı kalsaydı, doğrulanmamış bir
     * belgeyle iş almaya devam ederdi.
     */
    void backToDraft() {
        if (status == CarrierStatus.PENDING_REVIEW || status == CarrierStatus.APPROVED) {
            this.status = CarrierStatus.DRAFT;
            this.submittedAt = null;
        }
    }

    void addDocument(CarrierDocument document) {
        documents.add(document);
        document.attachTo(this);
    }

    void removeDocument(CarrierDocument document) {
        documents.remove(document);
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v;
    }
}
