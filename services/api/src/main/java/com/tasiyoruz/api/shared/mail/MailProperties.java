package com.tasiyoruz.api.shared.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Posta sağlayıcı ayarları.
 *
 * @param apiKey  sağlayıcının HTTP API anahtarı; doluysa gönderim HTTP üzerinden yapılır
 * @param baseUrl API kökü; testte sahte sunucuya çevrilebilsin diye ayarlanabilir
 */
@ConfigurationProperties(prefix = "tasiyoruz.mail")
public record MailProperties(String apiKey, String baseUrl) {

    public MailProperties {
        baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.brevo.com" : baseUrl.replaceAll("/+$", "");
    }

    /** HTTP API anahtarı verilmiş mi. */
    public boolean httpConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
