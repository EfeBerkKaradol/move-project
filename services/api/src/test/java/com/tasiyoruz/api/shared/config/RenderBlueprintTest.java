package com.tasiyoruz.api.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * Dağıtım tanımındaki Keycloak adresini sabitler.
 *
 * <p>Bu adres üç kez sessizce yanlış kuruldu ve hatası yalnızca dağıtımda görüldü:
 * önce {@code property: hostport} şemasız bir değer üretti, sonra ilk kurulumdan
 * kalan eski bir ortam değişkeni doğru değeri ezdi, sonunda {@code property: host}
 * herkese açık adres yerine iç ağ adını verdi ({@code tasiyoruz-keycloak}) ve
 * ortaya tarayıcının çözemediği bir issuer çıktı.
 *
 * <p>Asıl tehlike sessizliği: Keycloak da API de aynı yanlış değeri kullanınca
 * her şey tutarlı görünüyor, yalnızca gerçek bir giriş denemesi kırılıyor.
 */
class RenderBlueprintTest {

    private static final Path BLUEPRINT = Path.of("../../render.yaml");

    @SuppressWarnings("unchecked")
    private static Map<String, String> envOf(String serviceName) throws IOException {
        var root = (Map<String, Object>) new Yaml().load(Files.readString(BLUEPRINT));
        var services = (List<Map<String, Object>>) root.get("services");
        var service = services.stream()
                .filter(s -> serviceName.equals(s.get("name")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("render.yaml'da servis yok: " + serviceName));
        var env = new java.util.LinkedHashMap<String, String>();
        for (var e : (List<Map<String, Object>>) service.get("envVars")) {
            // Yalnızca sabit değerler; fromService/generateValue/sync burada anlamsız.
            var value = e.get("value");
            env.put((String) e.get("key"), value == null ? null : String.valueOf(value));
        }
        return env;
    }

    @Test
    void keycloakVeApi_ayniAdresiKullanir() throws IOException {
        var keycloak = envOf("tasiyoruz-keycloak").get("KC_HOSTNAME");
        var api = envOf("tasiyoruz-api").get("KEYCLOAK_HOST");

        // Eşleşmezlerse token'daki issuer ile API'nin beklediği issuer ayrışır ve
        // her kimlik doğrulamalı istek 401 döner.
        assertThat(api).isEqualTo(keycloak);
    }

    @Test
    void adres_herkeseAcikOlmali_icAgAdiDegil() throws IOException {
        var adres = envOf("tasiyoruz-keycloak").get("KC_HOSTNAME");

        assertThat(adres)
                .as("KC_HOSTNAME sabit bir değer olmalı; fromService iç ağ adını veriyor")
                .isNotNull()
                .as("tarayıcının çözebileceği bir adres olmalı (nokta içermeli)")
                .contains(".")
                .as("şema ayrıca veriliyor, adres yalnızca host olmalı")
                .doesNotContain("://")
                .as("iç port dışarıdan çalışmaz")
                .doesNotContain(":");
    }

    @Test
    void apiTarafinda_semaHttpsOlmali() throws IOException {
        assertThat(envOf("tasiyoruz-api").get("KEYCLOAK_SCHEME")).isEqualTo("https");
    }
}
