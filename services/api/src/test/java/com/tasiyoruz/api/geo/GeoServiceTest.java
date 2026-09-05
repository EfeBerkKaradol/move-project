package com.tasiyoruz.api.geo;

import static org.assertj.core.api.Assertions.assertThat;

import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.geo.api.GeoPoint;
import com.tasiyoruz.api.geo.api.GeoService;
import com.tasiyoruz.api.geo.api.RouteProvider;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class GeoServiceTest extends IntegrationTestBase {

    @Autowired GeoService geo;
    @Autowired RouteProvider routeProvider;

    /**
     * Önbellekli yol gerçekten çalışıyor mu? Cache manager bilinmeyen bir cache adında
     * hata attığında bu uç 500'e düşüyordu ve yalnızca parametresiz çağrıda görülüyordu.
     */
    @Test
    void tumIlcelerOnbellekliYoldanOkunur() {
        var first = geo.districts();
        var second = geo.districts();

        assertThat(first).hasSize(51);
        assertThat(second).isSameAs(first); // aynı örnek → cache devrede
    }

    @Test
    void ucSehirdeDeIlceTanimli() {
        assertThat(geo.districtsOf("34")).hasSize(25); // İstanbul
        assertThat(geo.districtsOf("06")).hasSize(11); // Ankara
        assertThat(geo.districtsOf("31")).hasSize(15); // Hatay
    }

    @Test
    void gecersizIdSessizceBosDoner() {
        assertThat(geo.district("bu-bir-uuid-degil")).isEmpty();
    }

    @Test
    void hizmetBolgesiDisindakiNoktaReddedilir() {
        assertThat(geo.inServiceArea(new GeoPoint(41.0082, 28.9784))).isTrue();  // İstanbul
        assertThat(geo.inServiceArea(new GeoPoint(38.4237, 27.1428))).isFalse(); // İzmir
    }

    @Test
    void takribiRotaYolDolambaciniHesabaKatar() {
        // Kadıköy → Beşiktaş kuş uçuşu ~5,5 km; yol katsayısıyla belirgin şekilde uzun olmalı
        var estimate = routeProvider.estimate(
                List.of(new GeoPoint(40.9900, 29.0300), new GeoPoint(41.0430, 29.0094)));

        assertThat(estimate.approximate()).isTrue();
        assertThat(estimate.distanceMeters()).isBetween(7_000, 10_000);
        assertThat(estimate.durationSeconds()).isGreaterThan(600);
    }
}
