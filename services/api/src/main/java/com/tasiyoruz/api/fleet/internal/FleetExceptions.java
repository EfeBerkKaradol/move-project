package com.tasiyoruz.api.fleet.internal;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Kullanıcıya anlamlı Türkçe mesajla dönen durumlar. */
final class FleetExceptions {
    private FleetExceptions() {}

    static ResponseStatusException notFound(String what) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, what + " bulunamadı.");
    }

    static ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu kayıt size ait değil.");
    }

    static ResponseStatusException conflict(String detail) {
        return new ResponseStatusException(HttpStatus.CONFLICT, detail);
    }

    static ResponseStatusException badRequest(String detail) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, detail);
    }
}
