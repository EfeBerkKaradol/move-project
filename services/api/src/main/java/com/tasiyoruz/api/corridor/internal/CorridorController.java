package com.tasiyoruz.api.corridor.internal;

import com.tasiyoruz.api.corridor.api.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/** Araç sahibinin boş dönüş koridorları. ROLE_DRIVER (SecurityConfig). */
@RestController
@RequestMapping("/api/v1/driver/corridors")
@Tag(name = "Boş dönüş koridorları")
class CorridorController {

    private final CorridorService corridors;

    CorridorController(CorridorService corridors) {
        this.corridors = corridors;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Dönüş rotasını koridor olarak tanımla")
    CorridorView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateCorridorRequest request) {
        return corridors.create(jwt.getSubject(), request);
    }

    @GetMapping
    List<CorridorView> mine(@AuthenticationPrincipal Jwt jwt) {
        return corridors.corridorsOf(jwt.getSubject());
    }

    @PostMapping("/{id}/pause")
    CorridorView pause(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return corridors.setPaused(jwt.getSubject(), id, true);
    }

    @PostMapping("/{id}/resume")
    CorridorView resume(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return corridors.setPaused(jwt.getSubject(), id, false);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        corridors.delete(jwt.getSubject(), id);
    }

    @GetMapping("/matches")
    @Operation(summary = "Koridorlara düşen açık ilanlar, puana göre sıralı")
    List<CorridorMatchView> matches(@AuthenticationPrincipal Jwt jwt) {
        return corridors.matchesOf(jwt.getSubject());
    }

    @PostMapping("/matches/{id}/ignore")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Bu eşleşmeyle ilgilenmiyorum")
    void ignore(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        corridors.ignore(jwt.getSubject(), id);
    }
}
