package com.tasiyoruz.api;

import com.tasiyoruz.api.fleet.api.*;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

/**
 * Onaylı taşıyıcı üretir.
 *
 * <p>Teklif verme artık onaylı başvuru istiyor (belge doğrulamasının yaptırımı).
 * Bu yüzden pazar yeri, koridor ve taşıma testlerinin taşıyıcısı da gerçek bir
 * başvuru akışından geçiyor — kestirme bir bayrak koysaydık, testler kuralın
 * gerçekten işlediğini değil yalnızca atlatılabildiğini gösterirdi.
 */
@Component
public class CarrierFixture {

    private final CarrierService carriers;

    CarrierFixture(CarrierService carriers) {
        this.carriers = carriers;
    }

    /** Başvuruyu açar, zorunlu belgeleri yükler, hepsini onaylar ve başvuruyu onaylar. */
    public void approve(String carrierId, String vehicleTypeCode) {
        carriers.apply(carrierId, new CarrierApplicationRequest(
                "Test Taşıyıcı", "05321234567", null, null, vehicleTypeCode, "34 TST 34"));

        var profile = carriers.profileOf(carrierId).orElseThrow();
        for (var kind : profile.missingDocuments()) {
            carriers.uploadDocument(carrierId, kind, LocalDate.now().plusYears(1), jpeg());
        }
        profile = carriers.submitForReview(carrierId);
        profile.documents().forEach(d -> carriers.reviewDocument(d.id(), new ReviewDecision(true, null)));
        carriers.reviewProfile(carrierId, new ReviewDecision(true, null));
    }

    public void approve(String carrierId) {
        approve(carrierId, "KAMYON");
    }

    private static UploadedFile jpeg() {
        var bytes = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9};
        return new UploadedFile("belge.jpg", "image/jpeg", bytes.length, new ByteArrayInputStream(bytes));
    }
}
