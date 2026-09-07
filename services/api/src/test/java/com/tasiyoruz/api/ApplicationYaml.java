package com.tasiyoruz.api;

import java.io.IOException;
import java.util.Map;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.FileSystemResource;

/**
 * Üretimde okunan {@code application.yml}'yi verilen ortam değişkenleriyle çözer.
 *
 * <p>Spring bağlamı açmıyor: {@code src/test/resources/application.yml} ana dosyayı
 * tamamen gölgeliyor, yani bağlam içinden bakan bir test oradaki ifadeleri hiç
 * sınamazdı. Dağıtımda sessizce yanlış çözülen bir varsayılan yalnızca canlıda
 * görülüyor; burada dosyanın kendisi okunuyor.
 */
public final class ApplicationYaml {

    private ApplicationYaml() {}

    public static StandardEnvironment resolvedWith(Map<String, Object> envVars) throws IOException {
        var env = new StandardEnvironment();
        env.getPropertySources().addLast(new MapPropertySource("test-env", envVars));
        new YamlPropertySourceLoader()
                .load("application", new FileSystemResource("src/main/resources/application.yml"))
                .forEach(ps -> env.getPropertySources().addLast(ps));
        return env;
    }
}
