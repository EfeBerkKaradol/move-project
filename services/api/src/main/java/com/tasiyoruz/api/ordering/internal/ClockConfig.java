package com.tasiyoruz.api.ordering.internal;

import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Süre dolumu test edilebilsin diye zaman enjekte ediliyor. */
@Configuration
class ClockConfig {
    @Bean
    @ConditionalOnMissingBean
    Clock clock() {
        return Clock.systemUTC();
    }
}
