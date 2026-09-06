package com.tasiyoruz.api.geo;

import static org.assertj.core.api.Assertions.assertThat;

import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.geo.api.RouteProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

/**
 * Maps anahtarı ortama girildiğinde uygulama ayağa kalkmalı ve bir rota sağlayıcısı
 * bulunmalı. Anahtarı koymak asla tek sağlayıcıyı devre dışı bırakıp API'yi düşürmemeli.
 */
@TestPropertySource(properties = "tasiyoruz.maps.api-key=AIza-gercek-gibi-bir-anahtar")
class MapsKeyBootTest extends IntegrationTestBase {
    @Autowired(required = false) RouteProvider provider;

    @Test
    void anahtarVarkenRotaSaglayicisiOlmali() {
        assertThat(provider).as("RouteProvider bean").isNotNull();
    }
}
