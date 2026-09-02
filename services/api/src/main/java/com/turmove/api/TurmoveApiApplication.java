package com.turmove.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.modulith.Modulithic;

/**
 * TurMove çekirdek API — modüler monolit.
 *
 * <p>Modüller arası iletişim yalnızca açık API paketleri (her modülün kök paketi) veya
 * domain event üzerinden yapılır. {@code internal} alt paketleri modül dışından
 * erişilemez; sınır ihlalleri ModularityTests ile CI'da yakalanır.
 *
 * <p>Bkz. docs/adr/0002-moduler-monolit.md
 */
@Modulithic(systemName = "TurMove")
@SpringBootApplication
public class TurmoveApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(TurmoveApiApplication.class, args);
    }
}
