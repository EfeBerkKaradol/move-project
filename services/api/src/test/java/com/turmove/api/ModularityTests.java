package com.turmove.api;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

/**
 * Modül sınırlarını CI'da zorlar (ADR-0002).
 *
 * <p>Bir modül başka bir modülün {@code internal} paketine erişirse veya
 * {@code allowedDependencies} listesinde olmayan bir modüle bağımlı olursa bu test kırılır.
 * Modüler monolitin mikroservise dönüşebilir kalmasını sağlayan tek mekanizma bu.
 */
class ModularityTests {

    static final ApplicationModules MODULES = ApplicationModules.of(TurmoveApiApplication.class);

    @Test
    void modulSinirlariIhlalEdilmemis() {
        MODULES.verify();
    }

    @Test
    void modulDokumantasyonuUret() {
        new Documenter(MODULES).writeDocumentation();
    }
}
