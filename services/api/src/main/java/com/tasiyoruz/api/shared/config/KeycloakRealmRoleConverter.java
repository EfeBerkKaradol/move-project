package com.tasiyoruz.api.shared.config;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Keycloak realm rollerini ({@code realm_access.roles}) Spring Security yetkilerine
 * ({@code ROLE_*}) çevirir. Varsayılan dönüştürücü yalnızca {@code scope} claim'ine
 * bakar ve realm rollerini görmez.
 */
class KeycloakRealmRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    @SuppressWarnings("unchecked")
    public AbstractAuthenticationToken convert(Jwt jwt) {
        var realmAccess = (Map<String, Object>) jwt.getClaims().get("realm_access");
        Collection<GrantedAuthority> authorities = realmAccess == null
                ? List.of()
                : ((List<String>) realmAccess.getOrDefault("roles", List.of()))
                        .stream()
                        .map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role))
                        .toList();
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
