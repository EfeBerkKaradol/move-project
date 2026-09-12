package com.tasiyoruz.api.finance.internal;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Finans hataları; mesajlar kullanıcıya ne yapacağını söylüyor. */
final class FinanceExceptions {

    private FinanceExceptions() {}

    static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    static ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu kayda erişim yetkiniz yok.");
    }
}
