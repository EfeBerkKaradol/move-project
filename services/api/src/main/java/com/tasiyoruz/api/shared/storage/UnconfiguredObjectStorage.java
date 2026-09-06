package com.tasiyoruz.api.shared.storage;

import java.io.InputStream;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Depo anahtarları yokken devreye giren, açıkça reddeden sürücü. */
class UnconfiguredObjectStorage implements ObjectStorage {

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Belge deposu yapılandırılmamış. Yönetici ile iletişime geçin.");
    }

    @Override
    public void put(String key, String contentType, long size, InputStream content) {
        throw unavailable();
    }

    @Override
    public Optional<StoredObject> get(String key) {
        throw unavailable();
    }

    @Override
    public void delete(String key) {
        throw unavailable();
    }
}
