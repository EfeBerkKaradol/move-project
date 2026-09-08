package com.tasiyoruz.api.compliance.internal;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Rızanın alındığı isteğin IP ve tarayıcı bilgisi.
 *
 * <p>Çağrı zincirinde elden ele taşınmıyor, istekten okunuyor: her çağrı yerine
 * iki parametre daha eklemek, bir yerde unutulduğunda ispatı sessizce zayıflatırdı.
 * İstek bağlamı yoksa (zamanlanmış iş, test) boş dönüyor — kayıt yine yazılıyor.
 *
 * <p>Bu iki alan da kişisel veri sayılır; saklama süresi ve dayanağı hukukçu
 * tarafından belirlenmeli (docs/14, açık sorular).
 */
@Component
class ClientContextResolver {

    /** Ters vekil arkasındaki gerçek istemci adresi. */
    private static final String FORWARDED_FOR = "X-Forwarded-For";

    String ipAddress() {
        var request = current();
        if (request == null) return null;
        var forwarded = request.getHeader(FORWARDED_FOR);
        if (forwarded != null && !forwarded.isBlank()) {
            // İlk değer istemci; sonrakiler vekiller
            var first = forwarded.split(",")[0].trim();
            return trim(first, 45);
        }
        return trim(request.getRemoteAddr(), 45);
    }

    String userAgent() {
        var request = current();
        return request == null ? null : trim(request.getHeader("User-Agent"), 400);
    }

    private static HttpServletRequest current() {
        var attrs = RequestContextHolder.getRequestAttributes();
        return attrs instanceof ServletRequestAttributes servlet ? servlet.getRequest() : null;
    }

    /** Sütun sınırını aşan başlık kaydı tamamen düşürmesin. */
    private static String trim(String value, int max) {
        if (value == null || value.isBlank()) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
