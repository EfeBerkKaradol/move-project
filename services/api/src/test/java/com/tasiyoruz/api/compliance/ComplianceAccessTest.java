package com.tasiyoruz.api.compliance;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tasiyoruz.api.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Uyum uçlarına kimin erişebildiği.
 *
 * <p>Bu testin varlık sebebi tek bir kural: <strong>her yönetici uyum işlemi
 * yapamaz.</strong> Operasyon ekibi belge onay kuyruğunu yürütüyor; hesap
 * kapatmak, ihlal bildirimlerini okumak ve kişisel veri görmek o işin parçası
 * değil. Kural SecurityConfig'te sıraya bağlı (uyum kuralı genel admin kuralından
 * önce geliyor) ve sıra bozulursa sessizce açılırdı — bu yüzden HTTP düzeyinde
 * sınanıyor.
 */
@AutoConfigureMockMvc
class ComplianceAccessTest extends IntegrationTestBase {

    private static final String OVERVIEW = "/api/v1/admin/compliance/overview";

    @Autowired MockMvc mockMvc;

    @Test
    void operasyonEkibiUyumPaneline_erisemez() throws Exception {
        mockMvc.perform(get(OVERVIEW).with(rol("ROLE_OPS_AGENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    void musteriVeAracSahibi_erisemez() throws Exception {
        mockMvc.perform(get(OVERVIEW).with(rol("ROLE_CUSTOMER"))).andExpect(status().isForbidden());
        mockMvc.perform(get(OVERVIEW).with(rol("ROLE_DRIVER"))).andExpect(status().isForbidden());
    }

    @Test
    void uyumRolu_erisebiliyor() throws Exception {
        mockMvc.perform(get(OVERVIEW).with(rol("ROLE_COMPLIANCE"))).andExpect(status().isOk());
    }

    @Test
    void yonetici_erisebiliyor() throws Exception {
        mockMvc.perform(get(OVERVIEW).with(rol("ROLE_ADMIN"))).andExpect(status().isOk());
    }

    @Test
    void oturumsuzErisimYok() throws Exception {
        mockMvc.perform(get(OVERVIEW)).andExpect(status().isUnauthorized());
    }

    /** Operasyonun kendi kuyruğu kapanmadı: uyum kuralı onu genel olarak dışlamamalı. */
    @Test
    void operasyonKendiPaneliniGormeyeDevamEdiyor() throws Exception {
        mockMvc.perform(get("/api/v1/admin/overview").with(rol("ROLE_OPS_AGENT")))
                .andExpect(status().isOk());
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor rol(String authority) {
        return jwt().authorities(new SimpleGrantedAuthority(authority));
    }
}
