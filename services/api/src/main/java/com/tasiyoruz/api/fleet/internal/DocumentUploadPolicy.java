package com.tasiyoruz.api.fleet.internal;

import com.tasiyoruz.api.fleet.api.DocumentKind;
import com.tasiyoruz.api.shared.storage.UploadValidation;

/**
 * Belge yüklemenin filo modülüne özgü kısmı.
 *
 * <p>Tip ve boyut kuralı burada tekrarlanmıyor; ortak kural {@link UploadValidation}
 * içinde, çünkü teslim fotoğrafları da aynı kuralı kullanıyor.
 */
final class DocumentUploadPolicy {

    private DocumentUploadPolicy() {}

    static void validate(String contentType, long size) {
        UploadValidation.validate(contentType, size);
    }

    static String storageKey(String carrierId, DocumentKind kind) {
        return UploadValidation.storageKey("belgeler", carrierId, kind.name());
    }

    static String safeFilename(String original, DocumentKind kind) {
        return UploadValidation.safeFilename(original, kind.name().toLowerCase());
    }
}
