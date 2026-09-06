package com.tasiyoruz.api.corridor;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/**
 * Puanlama saf bir hesap; veritabanı gerektirmiyor. Sınıf paket-özel olduğu için
 * yansımayla çağrılıyor — puanlamayı yalnızca eşleştirici kullanmalı, testin varlığı
 * onu dışa açmayı gerektirmesin.
 */
class MatchScoringTest {

    private static final Instant T0 = Instant.parse("2026-09-10T08:00:00Z");

    private static double call(String name, Class<?>[] types, Object... args) {
        try {
            Class<?> c = Class.forName("com.tasiyoruz.api.corridor.internal.MatchScoring");
            Method m = c.getDeclaredMethod(name, types);
            m.setAccessible(true);
            return (double) m.invoke(null, args);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e instanceof InvocationTargetException i ? i.getCause() : e);
        }
    }

    private static double detourFit(double km, int tolerance) {
        return call("detourFit", new Class<?>[] {double.class, int.class}, km, tolerance);
    }

    private static double timeFit(Instant lf, Instant lt, Instant cf, Instant ct) {
        return call("timeFit", new Class<?>[] {Instant.class, Instant.class, Instant.class, Instant.class},
                lf, lt, cf, ct);
    }

    private static double valueFit(String amount, double detourKm) {
        return call("valueFit", new Class<?>[] {BigDecimal.class, double.class}, new BigDecimal(amount), detourKm);
    }

    @Test
    void sapmasizIsTamPuan_toleransiAsanSifir() {
        assertThat(detourFit(0, 100)).isEqualTo(1.0);
        assertThat(detourFit(50, 100)).isEqualTo(0.5);
        assertThat(detourFit(100, 100)).isEqualTo(0.0);
        // Tolerans aşılmış bir iş zaten elenir; puan yine de negatife düşmemeli
        assertThat(detourFit(500, 100)).isEqualTo(0.0);
    }

    @Test
    void sifirToleransSadeceSifirSapmayiKabulEder() {
        assertThat(detourFit(0, 0)).isEqualTo(1.0);
        assertThat(detourFit(0.5, 0)).isEqualTo(0.0);
    }

    @Test
    void zamanUyumu_ilanPenceresineGoreOlculur() {
        var ilanBas = T0;
        var ilanBit = T0.plus(Duration.ofHours(4));

        // Koridor penceresi ilanı tamamen kapsıyor
        assertThat(timeFit(ilanBas, ilanBit, T0.minus(Duration.ofHours(2)), T0.plus(Duration.ofHours(8))))
                .isEqualTo(1.0);
        // Yarısı örtüşüyor
        assertThat(timeFit(ilanBas, ilanBit, T0.plus(Duration.ofHours(2)), T0.plus(Duration.ofHours(9))))
                .isEqualTo(0.5);
        // Hiç örtüşmüyor — eşleştirici bunu eler
        assertThat(timeFit(ilanBas, ilanBit, T0.plus(Duration.ofHours(5)), T0.plus(Duration.ofHours(9))))
                .isEqualTo(0.0);
    }

    @Test
    void noktaZamanliIlan_koridorPenceresiKapsiyorsaEslesir() {
        // Alış saati kesin verilmiş ilan: örtüşme süresi hep sıfır çıkar. Oran
        // hesaplansaydı böyle bir ilan hiçbir koridorla eşleşemezdi.
        assertThat(timeFit(T0, T0, T0.minus(Duration.ofHours(1)), T0.plus(Duration.ofHours(1)))).isEqualTo(1.0);
        assertThat(timeFit(T0, T0, T0.minus(Duration.ofHours(1)), T0)).isEqualTo(1.0);
        assertThat(timeFit(T0, T0, T0.plus(Duration.ofMinutes(1)), T0.plus(Duration.ofHours(2)))).isEqualTo(0.0);
    }

    @Test
    void tutarPuani_kilometreBasinaKazancaGoreArtarAmaDoyar() {
        double az = valueFit("1000", 50);   // 20 TL/km
        double orta = valueFit("6000", 50); // 120 TL/km — referans nokta
        double cok = valueFit("60000", 50); // 1200 TL/km

        assertThat(az).isLessThan(orta);
        assertThat(orta).isCloseTo(0.5, org.assertj.core.data.Offset.offset(0.001));
        assertThat(cok).isGreaterThan(orta).isLessThan(1.0);
    }

    @Test
    void sapmasizIsSonsuzPuanAlmaz() {
        // Ham 1/sapma kullanılsaydı burada sonsuz çıkardı
        assertThat(valueFit("5000", 0)).isLessThan(1.0).isGreaterThan(0.0);
    }
}
