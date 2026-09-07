package com.tasiyoruz.api.identity.internal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.tasiyoruz.api.identity.api.UserDirectory;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Keycloak yönetim API'si (client_credentials).
 *
 * <p>Token kısa ömürlü; süresi dolmadan yenileniyor. Ağ hatası ya da eksik yetki
 * {@link IllegalStateException} olarak yukarı çıkıyor — olay dinleyicisi bunu
 * yakalayıp tamamlanmamış yayın olarak bırakıyor, sessizce yutmuyor.
 */
@Component
@EnableConfigurationProperties(KeycloakAdminProperties.class)
class KeycloakAdminClient implements UserDirectory {

    private static final Logger log = LoggerFactory.getLogger(KeycloakAdminClient.class);

    private final KeycloakAdminProperties props;
    private final RestClient http;
    private volatile String token;
    private volatile Instant tokenExpiry = Instant.EPOCH;

    KeycloakAdminClient(KeycloakAdminProperties props) {
        this.props = props;
        this.http = RestClient.builder().baseUrl(props.baseUrl() == null ? "" : props.baseUrl()).build();
        if (!props.configured()) {
            log.warn("Keycloak yönetim istemcisi yapılandırılmamış — rol eşitleme ve e-posta çözümleme kapalı (ANAHTARLAR #19)");
        }
    }

    @Override
    public boolean available() {
        return props.configured();
    }

    @Override
    public Optional<UserSummary> user(String subject) {
        if (!available()) return Optional.empty();
        try {
            var u = http.get().uri("/admin/realms/{realm}/users/{id}", props.realm(), subject)
                    .header("Authorization", "Bearer " + token())
                    .retrieve().body(KcUser.class);
            return Optional.ofNullable(u).map(x -> new UserSummary(x.id, x.email, x.firstName, x.lastName, x.emailVerified));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    /** Rolü verir; zaten varsa Keycloak sessizce kabul eder (idempotent). */
    void grantRealmRole(String subject, String roleName) {
        var role = realmRole(roleName);
        http.post().uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", props.realm(), subject)
                .header("Authorization", "Bearer " + token())
                .contentType(MediaType.APPLICATION_JSON)
                .body(List.of(role))
                .retrieve().toBodilessEntity();
    }

    /** Rolü geri alır; yoksa Keycloak yine 204 döner. */
    void revokeRealmRole(String subject, String roleName) {
        var role = realmRole(roleName);
        http.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", props.realm(), subject)
                .header("Authorization", "Bearer " + token())
                .contentType(MediaType.APPLICATION_JSON)
                .body(List.of(role))
                .retrieve().toBodilessEntity();
    }

    private Map<String, String> realmRole(String roleName) {
        var role = http.get().uri("/admin/realms/{realm}/roles/{name}", props.realm(), roleName)
                .header("Authorization", "Bearer " + token())
                .retrieve().body(KcRole.class);
        if (role == null || role.id == null) {
            throw new IllegalStateException("Keycloak'ta rol bulunamadı: " + roleName);
        }
        return Map.of("id", role.id, "name", role.name);
    }

    private String token() {
        if (!available()) throw new IllegalStateException("Keycloak yönetim istemcisi yapılandırılmamış");
        if (token != null && Instant.now().isBefore(tokenExpiry)) return token;
        synchronized (this) {
            if (token != null && Instant.now().isBefore(tokenExpiry)) return token;
            var form = new LinkedMultiValueMap<String, String>();
            form.add("grant_type", "client_credentials");
            form.add("client_id", props.clientId());
            form.add("client_secret", props.clientSecret());
            var res = http.post().uri("/realms/{realm}/protocol/openid-connect/token", props.realm())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve().body(TokenResponse.class);
            if (res == null || res.accessToken == null) {
                throw new IllegalStateException("Keycloak servis hesabı token'ı alınamadı");
            }
            token = res.accessToken;
            // Süre dolmadan 30 sn önce yenile; sınırda kalan token 401 üretir
            tokenExpiry = Instant.now().plusSeconds(Math.max(res.expiresIn - 30, 10));
            return token;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TokenResponse(@JsonProperty("access_token") String accessToken,
                         @JsonProperty("expires_in") long expiresIn) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record KcUser(String id, String email, String firstName, String lastName, boolean emailVerified) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record KcRole(String id, String name) {}

    /** Test ve teşhis için: yapılandırma özeti (gizli anahtar hariç). */
    String describe() {
        return props.baseUrl() + " realm=" + props.realm() + " client=" + props.clientId()
                + " ttl=" + Duration.between(Instant.now(), tokenExpiry).toSeconds() + "s";
    }
}
