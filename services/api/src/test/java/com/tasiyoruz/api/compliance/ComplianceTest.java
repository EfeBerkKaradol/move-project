package com.tasiyoruz.api.compliance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tasiyoruz.api.CarrierFixture;
import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.ListingFixture;
import com.tasiyoruz.api.compliance.api.*;
import com.tasiyoruz.api.fleet.api.CarrierApplicationRequest;
import com.tasiyoruz.api.fleet.api.CarrierService;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.CreateListingRequest;
import com.tasiyoruz.api.ordering.api.MarketplaceService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

/**
 * Rıza, beyan ve uyum kayıtları.
 *
 * <p>Buradaki testlerin ortak sorusu tek: <strong>onay kutusu işaretlendiğinde
 * geriye ne kalıyor?</strong> İspat edilemeyen bir beyan, alınmamış beyanla aynı
 * şeydir.
 */
class ComplianceTest extends IntegrationTestBase {

    @Autowired ConsentService consents;
    @Autowired LegalDocuments documents;
    @Autowired ComplianceGuard guard;
    @Autowired MarketplaceService marketplace;
    @Autowired CarrierService carriers;
    @Autowired ListingFixture listingFixture;
    @Autowired CarrierFixture carrierFixture;
    @Autowired GeoService geo;

    private String user() {
        return "uyum-" + UUID.randomUUID();
    }

    // ── Hukuki belgeler ──────────────────────────────────────────────

    @Test
    void yururluktekiBelgelerinTekBirSurumuVar() {
        var active = documents.active();
        assertThat(active).isNotEmpty();
        // Aynı tipin iki yürürlükteki sürümü, hangisinin kabul edildiğini cevapsız bırakır
        assertThat(active).extracting(LegalDocumentView::docType).doesNotHaveDuplicates();
        assertThat(documents.active(LegalDocType.USER_TERMS)).isPresent();
        assertThat(documents.bySlug("kullanici-sozlesmesi")).isPresent();
    }

    // ── Rıza kaydı ───────────────────────────────────────────────────

    @Test
    void kabulSurumVeZamanDamgasiylaKaydediliyor() {
        var userId = user();
        var terms = documents.active(LegalDocType.USER_TERMS).orElseThrow();

        var recorded = consents.record(userId, new RecordConsent(ConsentType.TERMS_ACCEPTED,
                LegalDocType.USER_TERMS, terms.version(), true, "CONSENT_GATE", null));

        assertThat(recorded.docVersion()).isEqualTo(terms.version());
        assertThat(recorded.createdAt()).isNotNull();
        assertThat(recorded.isActive()).isTrue();
        assertThat(consents.hasAcceptedCurrent(userId, LegalDocType.USER_TERMS)).isTrue();
    }

    /** Sürüm istemciden geldiği gibi yazılsaydı kullanıcı eski metni kabul edip geçebilirdi. */
    @Test
    void surumIstemciDegilSunucuTarafindanYaziliyor() {
        var userId = user();
        var gercek = documents.active(LegalDocType.USER_TERMS).orElseThrow().version();

        var recorded = consents.record(userId, new RecordConsent(ConsentType.TERMS_ACCEPTED,
                LegalDocType.USER_TERMS, "0.1-uydurma", true, "CONSENT_GATE", null));

        assertThat(recorded.docVersion()).isEqualTo(gercek);
    }

    @Test
    void kabulEdilmemisSozlesmeBekleyenlerListesinde() {
        var userId = user();
        assertThat(documents.pendingFor(userId, false)).extracting(LegalDocumentView::docType)
                .contains(LegalDocType.USER_TERMS);

        consents.record(userId, new RecordConsent(ConsentType.TERMS_ACCEPTED,
                LegalDocType.USER_TERMS, null, true, "CONSENT_GATE", null));

        assertThat(documents.pendingFor(userId, false)).isEmpty();
    }

    /** Araç sahibi ek olarak taşıyıcı sözleşmesini de kabul ediyor. */
    @Test
    void aracSahibindenTasiyiciSozlesmesiDeIsteniyor() {
        var userId = user();
        assertThat(documents.pendingFor(userId, true)).extracting(LegalDocumentView::docType)
                .contains(LegalDocType.USER_TERMS, LegalDocType.CARRIER_TERMS);
    }

    // ── Pazarlama izni ───────────────────────────────────────────────

    @Test
    void pazarlamaIzniZorunluDegil_veGeriAlinabiliyor() {
        var userId = user();
        // Hiç verilmemişken de hesap çalışıyor: izin zorunlu olsaydı zorlama olurdu
        assertThat(consents.isActive(userId, ConsentType.MARKETING_EMAIL)).isFalse();

        consents.record(userId, RecordConsent.accepted(ConsentType.MARKETING_EMAIL, "ACCOUNT_SETTINGS"));
        assertThat(consents.isActive(userId, ConsentType.MARKETING_EMAIL)).isTrue();

        consents.withdraw(userId, ConsentType.MARKETING_EMAIL);
        assertThat(consents.isActive(userId, ConsentType.MARKETING_EMAIL)).isFalse();
    }

    /** Sözleşmeden çekilmenin karşılığı hesabın kapatılmasıdır, tek kaydın silinmesi değil. */
    @Test
    void sozlesmeKabuluGeriAlinamaz() {
        var userId = user();
        consents.record(userId, new RecordConsent(ConsentType.TERMS_ACCEPTED,
                LegalDocType.USER_TERMS, null, true, "CONSENT_GATE", null));

        assertThatThrownBy(() -> consents.withdraw(userId, ConsentType.TERMS_ACCEPTED))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("hesabını kapatman");
    }

    /** Geri çekme kaydı da tutuluyor: "ne zaman izin verdim, ne zaman geri aldım". */
    @Test
    void geriCekmeKayitOlarakDaDusuyor() {
        var userId = user();
        consents.record(userId, RecordConsent.accepted(ConsentType.MARKETING_SMS, "ACCOUNT_SETTINGS"));
        consents.withdraw(userId, ConsentType.MARKETING_SMS);

        var history = consents.historyOf(userId);
        assertThat(history).hasSize(2);
        assertThat(history).anyMatch(c -> !c.accepted());
        assertThat(history).anyMatch(c -> c.withdrawnAt() != null);
    }

    // ── İşlem bazlı beyan ────────────────────────────────────────────

    @Test
    void beyansizIlanYayinlanamaz() {
        var shipper = user();
        assertThatThrownBy(() -> marketplace.publish(shipper, listingRequest(shipper, false)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("hukuka uygunluğuna");
    }

    @Test
    void gondericiBeyaniIlanaBaglaniyor() {
        var shipper = user();
        var listing = marketplace.publish(shipper, listingRequest(shipper, true));

        var declarations = consents.forSubject(listing.id());
        assertThat(declarations).hasSize(1);
        var declaration = declarations.getFirst();
        assertThat(declaration.consentType()).isEqualTo(ConsentType.SHIPPER_DECLARATION);
        assertThat(declaration.source()).isEqualTo("LISTING_CREATE");
        // Sürüm yazılıyor: hangi metne göre beyan verildiği sonradan okunabilmeli
        assertThat(declaration.docVersion()).isNotBlank();

        // Testler veritabanını paylaşıyor: açık bırakılan ilan koridor eşleştirme
        // testlerinin sonucunu değiştiriyor. Kendi ardımızı topluyoruz.
        marketplace.cancel(shipper, listing.id(), "Test temizliği");
    }

    @Test
    void tasiyiciBeyanisizBasvuruTamamlanamaz() {
        var carrier = user();
        assertThatThrownBy(() -> carriers.apply(carrier, new CarrierApplicationRequest(
                "Test", "05321234567", null, null, "KAMYONET", "34 TST 34", false)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("taahhüd");
    }

    @Test
    void tasiyiciBeyaniKaydediliyor() {
        var carrier = user();
        carriers.apply(carrier, new CarrierApplicationRequest(
                "Test", "05321234567", null, null, "KAMYONET", "34 TST 34", true));

        assertThat(consents.latest(carrier, ConsentType.CARRIER_DECLARATION))
                .get().extracting(ConsentView::source).isEqualTo("CARRIER_ONBOARDING");
    }

    // ── Hesap kısıtlaması ────────────────────────────────────────────

    @Test
    void kaydiOlmayanHesapAktifSayiliyor() {
        assertThat(guard.statusOf(user())).isEqualTo(AccountStatus.ACTIVE);
    }

    private CreateListingRequest listingRequest(String shipper, boolean declared) {
        return new CreateListingRequest("INSTANT", "KAMYONET",
                new CreateListingRequest.Stop(district("34", "kadikoy"), 0, true),
                new CreateListingRequest.Stop(district("34", "besiktas"), 0, true),
                List.of(), listingFixture.items(), listingFixture.photoIds(shipper), declared,
                null, null, null);
    }

    private String district(String city, String slug) {
        return geo.districtsOf(city).stream().filter(d -> d.slug().equals(slug)).findFirst().orElseThrow().id();
    }
}
