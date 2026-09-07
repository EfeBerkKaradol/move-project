package com.tasiyoruz.api;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

/**
 * İleri alınabilen saat.
 *
 * <p>Süre dolumu gibi zamana bağlı kurallar, kaydı geçmiş tarihle yazarak değil saati
 * ileri alarak test ediliyor. Geçmiş tarihli kayıt yolu artık doğrulamayla kapalı ve
 * kapalı olması doğru; test o kapıyı açık tutmayı gerektirmemeli.
 */
public class MutableClock extends Clock {

    private volatile Duration offset = Duration.ZERO;

    public void advance(Duration by) {
        offset = offset.plus(by);
    }

    public void reset() {
        offset = Duration.ZERO;
    }

    @Override public ZoneId getZone() { return ZoneId.systemDefault(); }
    @Override public Clock withZone(ZoneId zone) { return this; }
    @Override public Instant instant() { return Instant.now().plus(offset); }
}
