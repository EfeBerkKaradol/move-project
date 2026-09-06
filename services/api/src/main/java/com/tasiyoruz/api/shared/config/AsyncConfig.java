package com.tasiyoruz.api.shared.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Modulith'in {@code @ApplicationModuleListener}'ı {@code @Async}'tır; bu olmadan
 * dinleyici, olayı yayınlayan isteğin thread'inde eşzamanlı çalışır ve modüller
 * arası ayrışma kâğıt üstünde kalır. Olaylar event_publication tablosuna yazıldığı
 * için dinleyici düşse bile kaybolmaz (docs/02 §4).
 *
 * <p>{@code @EnableScheduling} da burada: belge süre dolumu taraması (FR-2.4) bir
 * {@code @Scheduled} iş ve bu olmadan hiç çalışmaz — sessizce, hata vermeden.
 */
@Configuration
@EnableAsync
@EnableScheduling
class AsyncConfig {}
