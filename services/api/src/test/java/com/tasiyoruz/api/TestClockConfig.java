package com.tasiyoruz.api;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Uygulamadaki Clock bean'inin yerine ileri alınabilen saat. Tek bean: MutableClock zaten
 * bir Clock, ikinci bir "clock" bean'i tanımlamak iki primary aday üretiyordu.
 */
@TestConfiguration
public class TestClockConfig {

    @Bean
    @Primary
    MutableClock testClock() {
        return new MutableClock();
    }
}
