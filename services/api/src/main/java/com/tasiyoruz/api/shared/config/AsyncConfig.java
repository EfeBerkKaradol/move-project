package com.tasiyoruz.api.shared.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Modulith'in {@code @ApplicationModuleListener}'ı {@code @Async}'tır; bu olmadan
 * dinleyici, olayı yayınlayan isteğin thread'inde eşzamanlı çalışır ve modüller
 * arası ayrışma kâğıt üstünde kalır. Olaylar event_publication tablosuna yazıldığı
 * için dinleyici düşse bile kaybolmaz (docs/02 §4).
 */
@Configuration
@EnableAsync
class AsyncConfig {}
