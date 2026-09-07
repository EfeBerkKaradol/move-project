package com.tasiyoruz.api.identity.internal;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Keycloak yönetim API'si erişimi.
 *
 * @param baseUrl      Keycloak kök adresi (realm yolu hariç)
 * @param realm        realm adı
 * @param clientId     servis hesaplı istemci
 * @param clientSecret istemci gizli anahtarı; boşsa yönetim işlevleri kapalı
 * @param driverRole   onayda verilen realm rolü
 */
@ConfigurationProperties(prefix = "tasiyoruz.keycloak.admin")
public record KeycloakAdminProperties(
        String baseUrl, String realm, String clientId, String clientSecret, String driverRole) {

    public KeycloakAdminProperties {
        realm = realm == null || realm.isBlank() ? "tasiyoruz" : realm;
        clientId = clientId == null || clientId.isBlank() ? "tasiyoruz-api" : clientId;
        driverRole = driverRole == null || driverRole.isBlank() ? "DRIVER" : driverRole;
    }

    public boolean configured() {
        return baseUrl != null && !baseUrl.isBlank() && clientSecret != null && !clientSecret.isBlank();
    }
}
