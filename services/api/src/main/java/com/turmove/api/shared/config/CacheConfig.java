package com.turmove.api.shared.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * Katalog verisi (araç tipleri, kategoriler, eşyalar) çok okunup az yazılıyor.
 * Araç öneri motorunun &lt;100 ms hedefi bu cache'e dayanıyor (bkz. docs/04).
 */
@Configuration
@EnableCaching
class CacheConfig {}
