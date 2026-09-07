package com.tasiyoruz.api.notification.internal;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param from    gönderen adresi
 * @param siteUrl e-postadaki bağlantıların kökü; sabit yazılsaydı üretimde localhost'a giderdi
 * @param enabled false ise posta gönderilmez, kayıt SKIPPED olarak tutulur (test ortamı)
 */
@ConfigurationProperties(prefix = "tasiyoruz.notification")
public record NotificationProperties(String from, String siteUrl, boolean enabled) {
    public NotificationProperties {
        from = from == null || from.isBlank() ? "no-reply@tasiyoruz.local" : from;
        siteUrl = siteUrl == null || siteUrl.isBlank() ? "http://localhost:3000" : siteUrl.replaceAll("/+$", "");
    }
}
