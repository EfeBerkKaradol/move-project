package com.tasiyoruz.api.fleet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.fleet.api.*;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

/**
 * Taşıyıcı başvurusu ve belge doğrulama (docs/01 §4.2).
 *
 * <p>Dosyalar gerçek bir MinIO kovasına yazılıyor; indirme de oradan okuyor.
 */
class CarrierServiceTest extends IntegrationTestBase {

    @Autowired CarrierService carriers;
    /** Sayaçlar dar yüzde duruyor; CarrierService onları taşımıyor. */
    @Autowired CarrierDirectory directory;

    private static String carrier() {
        return "carrier-" + UUID.randomUUID();
    }

    private static CarrierApplicationRequest application(String vehicle) {
        return new CarrierApplicationRequest("Ali Demir", "05321234567", null, null, vehicle, "34 ABC 123", true);
    }

    private static UploadedFile file(String name, String type, int bytes) {
        var content = new byte[bytes];
        return new UploadedFile(name, type, bytes, new ByteArrayInputStream(content));
    }

    private static UploadedFile jpeg() {
        return file("ruhsat.jpg", "image/jpeg", 2048);
    }

    /** Küçük araçta SRC ve K belgesi istenmiyor; zorunlu liste üçe iniyor. */
    private static void uploadSmallVehicleDocuments(CarrierService carriers, String id) {
        carriers.uploadDocument(id, DocumentKind.DRIVING_LICENCE, null, jpeg());
        carriers.uploadDocument(id, DocumentKind.VEHICLE_REGISTRATION, null, jpeg());
        carriers.uploadDocument(id, DocumentKind.TRAFFIC_INSURANCE, LocalDate.now().plusMonths(6), jpeg());
    }

    @Test
    void basvuruAcilir_zorunluBelgelerAracTipineGoreDegisir() {
        var kucuk = carrier();
        var kucukProfil = carriers.apply(kucuk, application("MOTOR"));
        assertThat(kucukProfil.status()).isEqualTo(CarrierStatus.DRAFT);
        assertThat(kucukProfil.missingDocuments())
                .as("Motokuryeden SRC ve K belgesi istenmez")
                .containsExactlyInAnyOrder(DocumentKind.DRIVING_LICENCE,
                        DocumentKind.VEHICLE_REGISTRATION, DocumentKind.TRAFFIC_INSURANCE);

        var buyuk = carrier();
        var buyukProfil = carriers.apply(buyuk, application("KAMYON"));
        assertThat(buyukProfil.missingDocuments())
                .contains(DocumentKind.SRC, DocumentKind.K_DOCUMENT);
    }

    @Test
    void plakaNormalize_edilir() {
        var id = carrier();
        var p = carriers.apply(id, new CarrierApplicationRequest(
                "Ayşe Yıldız", "05321234567", null, null, "MOTOR", "34 abc 123", true));
        assertThat(p.plate()).isEqualTo("34ABC123");
    }

    @Test
    void kucukHarfliPlakaKabulEdilir() {
        // Doğrulama yalnızca büyük harf isteseydi, alan ekranda büyük harf göründüğü
        // hâlde "34 abc 123" yazan kullanıcı reddedilirdi
        var id = carrier();
        var p = carriers.apply(id, new CarrierApplicationRequest(
                "Ali Demir", "05321234567", null, null, "MOTOR", "34 abc 123", true));
        assertThat(p.plate()).isEqualTo("34ABC123");
    }

    @Test
    void eksikBelgeyleIncelemeyeGonderilemez() {
        var id = carrier();
        carriers.apply(id, application("MOTOR"));
        carriers.uploadDocument(id, DocumentKind.DRIVING_LICENCE, null, jpeg());

        assertThatThrownBy(() -> carriers.submitForReview(id))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Eksik belge");
    }

    @Test
    void belgelerTamamlanincaIncelemeyeGider_veIncelemedeDegistirilemez() {
        var id = carrier();
        carriers.apply(id, application("MOTOR"));
        uploadSmallVehicleDocuments(carriers, id);

        var submitted = carriers.submitForReview(id);
        assertThat(submitted.status()).isEqualTo(CarrierStatus.PENDING_REVIEW);
        assertThat(submitted.submittedAt()).isNotNull();

        assertThatThrownBy(() -> carriers.uploadDocument(id, DocumentKind.DRIVING_LICENCE, null, jpeg()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("incelemede");
        assertThatThrownBy(() -> carriers.apply(id, application("KAMYONET")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("incelemede");
    }

    @Test
    void belgeleriOnaylanmamisBasvuruOnaylanamaz() {
        var id = carrier();
        carriers.apply(id, application("MOTOR"));
        uploadSmallVehicleDocuments(carriers, id);
        carriers.submitForReview(id);

        assertThatThrownBy(() -> carriers.reviewProfile(id, new ReviewDecision(true, null)))
                .as("Her belge ayrı onaylanmadan başvuru onaylanamaz (FR-2.3)")
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Önce şu belgeleri onaylayın");
    }

    @Test
    void tumBelgelerOnaylanincaBasvuruOnaylanir() {
        var id = carrier();
        carriers.apply(id, application("MOTOR"));
        uploadSmallVehicleDocuments(carriers, id);
        var profile = carriers.submitForReview(id);
        profile.documents().forEach(d -> carriers.reviewDocument(d.id(), new ReviewDecision(true, null)));

        var approved = carriers.reviewProfile(id, new ReviewDecision(true, "Belgeler tam"));
        assertThat(approved.status()).isEqualTo(CarrierStatus.APPROVED);
        assertThat(approved.documents()).allMatch(d -> d.status() == DocumentStatus.APPROVED);
    }

    /**
     * Araçlar sayfası "şu kadar panelvan kayıtlı" diyor. Sayıya onaylanmamış
     * başvurular da girseydi, ürün iş alabilecek olandan fazla araç vadetmiş
     * olurdu — ve bu ancak teklif gelmeyince fark edilirdi.
     *
     * <p>Ölçüm FARK üzerinden: bu sınıftaki testler aynı veritabanını paylaşıyor
     * ve mutlak sayı, testlerin çalışma sırasına bağlı olurdu.
     */
    @Test
    void aracTipiSayaci_yalnizcaOnayliTasiyiciyiSayar() {
        long oncesi = directory.approvedCountByVehicleType().getOrDefault("MOTOR", 0L);

        var onayli = carrier();
        carriers.apply(onayli, application("MOTOR"));
        uploadSmallVehicleDocuments(carriers, onayli);
        var profile = carriers.submitForReview(onayli);
        profile.documents().forEach(d -> carriers.reviewDocument(d.id(), new ReviewDecision(true, null)));
        carriers.reviewProfile(onayli, new ReviewDecision(true, "Belgeler tam"));

        // İncelemeyi bekleyen ikinci bir MOTOR başvurusu sayıya GİRMEMELİ
        var bekleyen = carrier();
        carriers.apply(bekleyen, application("MOTOR"));
        uploadSmallVehicleDocuments(carriers, bekleyen);
        carriers.submitForReview(bekleyen);

        assertThat(directory.approvedCountByVehicleType().get("MOTOR")).isEqualTo(oncesi + 1);
    }

    /** Onaylanmamış başvuru hiçbir sayacı kıpırdatmamalı. */
    @Test
    void aracTipiSayaci_onaylanmamisBasvuruyuSaymaz() {
        long oncesi = directory.approvedCountByVehicleType().getOrDefault("KAMYON", 0L);

        var id = carrier();
        carriers.apply(id, application("KAMYON"));

        assertThat(directory.approvedCountByVehicleType().getOrDefault("KAMYON", 0L)).isEqualTo(oncesi);
    }

    @Test
    void redGerekcesizYapilamaz() {
        var id = carrier();
        carriers.apply(id, application("MOTOR"));
        uploadSmallVehicleDocuments(carriers, id);
        var profile = carriers.submitForReview(id);

        assertThatThrownBy(() -> carriers.reviewDocument(profile.documents().getFirst().id(),
                new ReviewDecision(false, "  ")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Red gerekçesi zorunlu");
    }

    @Test
    void onayliBelgeYenidenYuklenince_onayVeBasvuruSifirlanir() {
        var id = carrier();
        carriers.apply(id, application("MOTOR"));
        uploadSmallVehicleDocuments(carriers, id);
        var profile = carriers.submitForReview(id);
        profile.documents().forEach(d -> carriers.reviewDocument(d.id(), new ReviewDecision(true, null)));
        carriers.reviewProfile(id, new ReviewDecision(true, null));

        var after = carriers.uploadDocument(id, DocumentKind.DRIVING_LICENCE, null, jpeg());

        assertThat(after.status())
                .as("Onaylı taşıyıcı belgesini değiştirince yeniden incelemeye girmeli")
                .isEqualTo(CarrierStatus.DRAFT);
        assertThat(after.documents()).filteredOn(d -> d.kind() == DocumentKind.DRIVING_LICENCE)
                .allMatch(d -> d.status() == DocumentStatus.PENDING);
    }

    @Test
    void yuklenenDosyaGeriIndirilebilir_baskasiIndiremez() {
        var id = carrier();
        carriers.apply(id, application("MOTOR"));
        var profile = carriers.uploadDocument(id, DocumentKind.DRIVING_LICENCE, null,
                new UploadedFile("ehliyet.jpg", "image/jpeg", 5,
                        new ByteArrayInputStream("MERHA".getBytes(StandardCharsets.UTF_8))));
        var documentId = profile.documents().getFirst().id();

        var download = carriers.download(id, false, documentId);
        assertThat(download.contentType()).isEqualTo("image/jpeg");
        assertThat(download.size()).isEqualTo(5);
        assertThat(download.filename()).isEqualTo("ehliyet.jpg");

        assertThatThrownBy(() -> carriers.download("baska-tasiyici", false, documentId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("size ait değil");

        assertThat(carriers.download("operasyon", true, documentId))
                .as("Operasyon rolü inceleme için erişebilmeli")
                .isNotNull();
    }

    @Test
    void desteklenmeyenTipVeBuyukDosyaReddedilir() {
        var id = carrier();
        carriers.apply(id, application("MOTOR"));

        assertThatThrownBy(() -> carriers.uploadDocument(id, DocumentKind.DRIVING_LICENCE, null,
                file("belge.exe", "application/x-msdownload", 1024)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Yalnızca fotoğraf");

        assertThatThrownBy(() -> carriers.uploadDocument(id, DocumentKind.DRIVING_LICENCE, null,
                file("dev.jpg", "image/jpeg", 9 * 1024 * 1024)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("en fazla 8 MB");
    }

    @Test
    void gecmisSonKullanmaTarihiKabulEdilmez() {
        var id = carrier();
        carriers.apply(id, application("MOTOR"));

        assertThatThrownBy(() -> carriers.uploadDocument(id, DocumentKind.TRAFFIC_INSURANCE,
                LocalDate.now().minusDays(1), jpeg()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("son kullanma tarihi geçmiş");
    }

    @Test
    void kurumsalBasvuruVergiLevhasiIster() {
        var id = carrier();
        var p = carriers.apply(id, new CarrierApplicationRequest(
                "Demir Nakliyat Ltd.", "05321234567", "Demir Nakliyat Ltd. Şti.", "1234567890",
                "MOTOR", "34 ABC 123", true));

        assertThat(p.missingDocuments()).contains(DocumentKind.TAX_PLATE);
    }
}
