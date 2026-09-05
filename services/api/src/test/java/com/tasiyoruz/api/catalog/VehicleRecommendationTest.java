package com.tasiyoruz.api.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import com.tasiyoruz.api.catalog.api.CargoDeclarationRequest;
import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.catalog.api.VehicleRecommendationService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Öneri motorunun davranış testleri. Bunlar dokümandaki örneklerin doğrudan karşılığı —
 * docs/08'deki senaryolar burada yaşayan spesifikasyon hâline geliyor.
 */
class VehicleRecommendationTest extends IntegrationTestBase {

    @Autowired
    VehicleRecommendationService service;

    @Test
    void buzdolabiVeKolilerIcinPanelvanOnerir() {
        var request = new CargoDeclarationRequest(
                "TEKIL_ESYA",
                List.of(
                        new CargoDeclarationRequest.Item("BUZDOLABI_NOFROST", 1),
                        new CargoDeclarationRequest.Item("CAMASIR_MAKINESI", 1)),
                null,
                8,
                List.of(new CargoDeclarationRequest.Stop(3, false),
                        new CargoDeclarationRequest.Stop(1, true)));

        var result = service.recommend(request);

        // Buzdolabı 0,80 + çamaşır 0,35 + 8 standart koli 0,96 = 2,11 m³
        // istifleme payıyla (×1,25) 2,64 m³ → panelvanın 5 m³ kasasının ~yarısı
        assertThat(result.primary().vehicleTypeCode()).isEqualTo("PANELVAN");
        assertThat(result.estimate().volumeM3()).isEqualByComparingTo("2.64");
        assertThat(result.estimate().longestEdgeCm()).isEqualTo(180);
        assertThat(result.primary().fillRatePercent()).isEqualTo(53);
        // Mini panelvan hacim olarak da yetmiyor: 2,50 m³ < 2,64 m³
        assertThat(result.primary().whyNotSmaller().vehicleTypeCode()).isEqualTo("MINI_PANELVAN");
    }

    @Test
    void enUzunKenarSigmiyorsaBirUstAraciOnerirVeSebebiniAciklar() {
        // Çift yatak 200 cm — hacmi mini panelvana (2,5 m³) sığar ama 150 cm'lik kasaya girmez
        var request = new CargoDeclarationRequest(
                "TEKIL_ESYA",
                List.of(new CargoDeclarationRequest.Item("YATAK_CIFT", 1)),
                null, null, List.of());

        var result = service.recommend(request);

        assertThat(result.primary().vehicleTypeCode()).isEqualTo("PANELVAN");
        assertThat(result.primary().whyNotSmaller()).isNotNull();
        assertThat(result.primary().whyNotSmaller().vehicleTypeCode()).isEqualTo("MINI_PANELVAN");
        assertThat(result.primary().whyNotSmaller().reason())
                .isEqualTo("200 cm'lik parça, Mini panelvan kasasına (150 cm) sığmıyor.");
    }

    @Test
    void kucukPaketIcinMotorOnerir() {
        var request = new CargoDeclarationRequest("BELGE_PAKET", List.of(), null, 1, List.of());

        var result = service.recommend(request);

        assertThat(result.primary().vehicleTypeCode()).isEqualTo("MOTOR");
    }

    @Test
    void evPresetiIcinKamyonetOnerir() {
        var request = new CargoDeclarationRequest("EV", List.of(), "EV_2A1_ORTA", null, List.of());

        var result = service.recommend(request);

        assertThat(result.primary().vehicleTypeCode()).isEqualTo("KAMYONET");
    }

    @Test
    void asansorsuzUstKattaHamaliyeOnerir() {
        var request = new CargoDeclarationRequest(
                "TEKIL_ESYA",
                List.of(new CargoDeclarationRequest.Item("BUZDOLABI_NOFROST", 1)),
                null, null,
                List.of(new CargoDeclarationRequest.Stop(4, false)));

        var result = service.recommend(request);

        assertThat(result.suggestedExtras())
                .anyMatch(e -> e.code().equals("PORTERAGE") && e.reason().contains("asansör yok"));
    }
}
