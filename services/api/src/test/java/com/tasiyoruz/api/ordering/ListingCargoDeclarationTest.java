package com.tasiyoruz.api.ordering;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tasiyoruz.api.CarrierFixture;
import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.ListingFixture;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.ordering.api.*;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

/**
 * Yük beyanı ve fotoğraflar: ilan neyi taşıdığını söylemeden yayınlanamıyor, beyan
 * katalogdan kopyalanıyor, kareleri kimin görebileceği ilanın durumuna bağlı.
 */
class ListingCargoDeclarationTest extends IntegrationTestBase {

    @Autowired MarketplaceService marketplace;
    @Autowired ListingPhotos photos;
    @Autowired ListingFixture listingFixture;
    @Autowired GeoService geo;
    @Autowired CarrierFixture carrierFixture;

    static final String SHIPPER = "beyan-shipper", OTHER = "beyan-baskasi";
    static final String CARRIER = "beyan-carrier", RAKIP = "beyan-rakip";

    private static boolean approved;

    @BeforeEach
    void onayliTasiyicilar() {
        if (!approved) {
            carrierFixture.approve(CARRIER);
            carrierFixture.approve(RAKIP);
            approved = true;
        }
    }

    // ── Beyan ────────────────────────────────────────────────────────

    @Test
    void beyanKatalogdanKopyalanir_veAyniKalemTekSatirdaToplanir() {
        var listing = marketplace.publish(SHIPPER, request(List.of(
                new CreateListingRequest.ItemLine("KOLTUK_3LU", 1),
                new CreateListingRequest.ItemLine("KOLI_STANDART", 5),
                // Aynı kalem arayüzde iki kez eklenmiş olabilir
                new CreateListingRequest.ItemLine("KOLI_STANDART", 3))));

        assertThat(listing.cargoItems()).hasSize(2);
        var koli = listing.cargoItems().stream().filter(i -> i.itemCode().equals("KOLI_STANDART")).findFirst().orElseThrow();
        assertThat(koli.quantity()).isEqualTo(8);
        // Ad ve hacim istemciden değil katalogdan geliyor
        assertThat(koli.displayName()).isEqualTo("Standart koli");
        assertThat(koli.volumeM3()).isEqualByComparingTo("0.12");
        assertThat(koli.totalVolumeM3()).isEqualByComparingTo("0.96");
    }

    /** Üçlü koltuk 1,30 m³ + 8 standart koli 0,96 m³. */
    @Test
    void toplamHacimVeAgirlikBeyandanHesaplanir() {
        var listing = marketplace.publish(SHIPPER, request(List.of(
                new CreateListingRequest.ItemLine("KOLTUK_3LU", 1),
                new CreateListingRequest.ItemLine("KOLI_STANDART", 8))));

        assertThat(listing.declaredVolumeM3()).isEqualByComparingTo("2.26");
        assertThat(listing.declaredWeightKg()).isEqualTo(60 + 8 * 12);
    }

    /** Katalogda yeni açılan koltuk tipleri gerçekten seçilebiliyor (V19). */
    @Test
    void tekliVeKoseKoltukSecilebilir() {
        var listing = marketplace.publish(SHIPPER, request(List.of(
                new CreateListingRequest.ItemLine("KOLTUK_TEKLI", 2),
                new CreateListingRequest.ItemLine("KOLTUK_L", 1))));

        assertThat(listing.cargoItems()).extracting(DeclaredItem::displayName)
                .containsExactlyInAnyOrder("Tekli koltuk / berjer", "L (köşe) koltuk");
    }

    @Test
    void beyansizIlanYayinlanamaz() {
        assertThatThrownBy(() -> marketplace.publish(SHIPPER, request(List.of())))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("kalem kalem");
    }

    @Test
    void fotografsizIlanYayinlanamaz() {
        var r = request(listingFixture.items());
        var fotografsiz = new CreateListingRequest(r.serviceModel(), r.vehicleTypeCode(), r.pickup(), r.dropoff(),
                r.extraServices(), r.cargoItems(), List.of(), true, r.cargoDescription(), null, null);

        assertThatThrownBy(() -> marketplace.publish(SHIPPER, fotografsiz))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("fotoğraf");
    }

    /** Sessizce atlansaydı beyanı eksik bir ilan yayınlanırdı. */
    @Test
    void taninmayanEsyaKoduReddedilir() {
        assertThatThrownBy(() -> marketplace.publish(SHIPPER,
                request(List.of(new CreateListingRequest.ItemLine("UZAY_MEKIGI", 1)))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("UZAY_MEKIGI");
    }

    // ── Fotoğraflar ──────────────────────────────────────────────────

    @Test
    void baskasininFotografiIlanaEklenemez() {
        var yabanci = listingFixture.photoIds(OTHER);
        var r = request(listingFixture.items());
        var calinti = new CreateListingRequest(r.serviceModel(), r.vehicleTypeCode(), r.pickup(), r.dropoff(),
                r.extraServices(), r.cargoItems(), yabanci, true, null, null, null);

        assertThatThrownBy(() -> marketplace.publish(SHIPPER, calinti))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void ayniFotografIkinciIlanaEklenemez() {
        var ids = listingFixture.photoIds(SHIPPER);
        var r = request(listingFixture.items());
        var ilk = new CreateListingRequest(r.serviceModel(), r.vehicleTypeCode(), r.pickup(), r.dropoff(),
                r.extraServices(), r.cargoItems(), ids, true, null, null, null);
        marketplace.publish(SHIPPER, ilk);

        assertThatThrownBy(() -> marketplace.publish(SHIPPER, ilk))
                .isInstanceOf(ResponseStatusException.class);
    }

    /** Araç sahibi teklifini o kareye bakarak verdi; sonradan silinmesi teklifi boşa düşürürdü. */
    @Test
    void yayinlanmisFotografSilinemez_yayinlanmamisSilinir() {
        var bekleyen = listingFixture.photoIds(SHIPPER).getFirst();
        photos.delete(SHIPPER, bekleyen); // iliştirilmemiş: sorunsuz

        var listing = marketplace.publish(SHIPPER, request(listingFixture.items()));
        var yayinda = listing.photos().getFirst().id();

        assertThatThrownBy(() -> photos.delete(SHIPPER, yayinda))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("silinemez");
    }

    @Test
    void baskasininFotografiSilinemez() {
        var id = listingFixture.photoIds(OTHER).getFirst();
        assertThatThrownBy(() -> photos.delete(SHIPPER, id)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void fotografDisiDosyaKabulEdilmez() {
        var pdf = new byte[] {'%', 'P', 'D', 'F'};
        assertThatThrownBy(() -> photos.upload(SHIPPER, "application/pdf", pdf.length, new ByteArrayInputStream(pdf)))
                .isInstanceOf(ResponseStatusException.class);
    }

    // ── Taşıyıcı görünürlüğü ─────────────────────────────────────────

    @Test
    void acikIlanTumOnayliTasiyicilaraGorunur_yukVerenGizlenir() {
        var listing = marketplace.publish(SHIPPER, request(listingFixture.items()));

        var gorunen = marketplace.listingForCarrier(RAKIP, listing.id()).orElseThrow();
        assertThat(gorunen.shipperId()).isNull();
        assertThat(gorunen.cargoItems()).isNotEmpty();
        assertThat(gorunen.photos()).isNotEmpty();
    }

    /**
     * İş verildikten sonra kareler yalnızca işi alanda kalıyor: teklifi kabul
     * edilmeyenin yükün fotoğrafına bakmayı sürdürmesi için sebep yok.
     */
    @Test
    void isVerildiktenSonraIlanYalnizcaKazanandaKalir() {
        var listing = marketplace.publish(SHIPPER, request(listingFixture.items()));
        var offer = marketplace.submitOffer(CARRIER, "Ali D.", listing.id(),
                new SubmitOfferRequest(new BigDecimal("3500"), null, null));
        marketplace.acceptOffer(SHIPPER, listing.id(), offer.id());

        assertThat(marketplace.listingForCarrier(CARRIER, listing.id())).isPresent();
        assertThat(marketplace.listingForCarrier(RAKIP, listing.id())).isEmpty();
    }

    @Test
    void iptalEdilenIlanHicbirTasiyiciyaGorunmez() {
        var listing = marketplace.publish(SHIPPER, request(listingFixture.items()));
        marketplace.cancel(SHIPPER, listing.id(), "Vazgeçtim");

        assertThat(marketplace.listingForCarrier(CARRIER, listing.id())).isEmpty();
    }

    // ── Yardımcılar ──────────────────────────────────────────────────

    private CreateListingRequest request(List<CreateListingRequest.ItemLine> items) {
        return new CreateListingRequest("INSTANT", "KAMYONET",
                new CreateListingRequest.Stop(district("34", "kadikoy"), 0, true),
                new CreateListingRequest.Stop(district("34", "besiktas"), 0, true),
                List.of(), items, listingFixture.photoIds(SHIPPER), true, null, null, null);
    }

    private String district(String city, String slug) {
        return geo.districtsOf(city).stream().filter(d -> d.slug().equals(slug)).findFirst().orElseThrow().id();
    }
}
