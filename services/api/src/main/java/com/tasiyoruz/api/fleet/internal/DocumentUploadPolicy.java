package com.tasiyoruz.api.fleet.internal;

import static com.tasiyoruz.api.fleet.internal.FleetExceptions.badRequest;

import com.tasiyoruz.api.fleet.api.DocumentKind;
import java.util.Set;
import java.util.UUID;

/**
 * Yüklenen dosyanın kabul kuralları.
 *
 * <p>MIME tipi beyaz listeyle sınırlanıyor: içerik tipini istemci gönderiyor ve
 * uydurulabiliyor, ama depoya ne yazacağımızı beyana bırakmak yerine bilinen bir
 * kümeye indirgemek saldırı yüzeyini daraltıyor. Dosya hiçbir zaman çalıştırılabilir
 * bir konuma yazılmıyor, indirilirken de {@code attachment} olarak dönüyor.
 */
final class DocumentUploadPolicy {

    /** Telefon kamerasından gelen fotoğraflar ve taranmış PDF'ler. */
    static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf");

    /** 8 MB. Telefon fotoğrafı için fazlasıyla yeterli, yükleme ucunu da korur. */
    static final long MAX_SIZE_BYTES = 8L * 1024 * 1024;

    private DocumentUploadPolicy() {}

    static void validate(String contentType, long size) {
        if (size <= 0) throw badRequest("Dosya boş.");
        if (size > MAX_SIZE_BYTES) {
            throw badRequest("Dosya en fazla %d MB olabilir.".formatted(MAX_SIZE_BYTES / 1024 / 1024));
        }
        var normalized = contentType == null ? "" : contentType.toLowerCase().split(";")[0].trim();
        if (!ALLOWED_TYPES.contains(normalized)) {
            throw badRequest("Yalnızca fotoğraf (JPEG, PNG, HEIC, WebP) ya da PDF yükleyebilirsiniz.");
        }
    }

    /**
     * Depo anahtarı. Rastgele bir bileşen taşıyor: anahtar tahmin edilebilir olsaydı
     * ve kova bir gün yanlışlıkla herkese açılsaydı belgeler sıralanabilir olurdu.
     */
    static String storageKey(String carrierId, DocumentKind kind) {
        return "belgeler/%s/%s-%s".formatted(carrierId, kind.name().toLowerCase(),
                UUID.randomUUID().toString().replace("-", ""));
    }

    /** İndirilen dosyanın adı; başlıkta kullanılacağı için sadeleştiriliyor. */
    static String safeFilename(String original, DocumentKind kind) {
        if (original == null || original.isBlank()) return kind.name().toLowerCase();
        return original.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
