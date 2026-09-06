package com.tasiyoruz.api.shared.storage;

import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Depoya yazılabilecek dosyaların kabul kuralları.
 *
 * <p>Kural burada, adaptörün yanında duruyor çünkü birden fazla modül dosya yüklüyor
 * (taşıyıcı belgeleri ve teslim fotoğrafları). Her modül kendi kopyasını tutsaydı biri
 * sıkılaştırıldığında diğeri sessizce gevşek kalırdı — güvenlik kuralları için en
 * tehlikeli kopyalama biçimi bu.
 *
 * <p>İçerik tipini istemci beyan ediyor ve uydurulabiliyor; beyaz liste onu bilinen bir
 * kümeye indirgeyerek saldırı yüzeyini daraltıyor. Dosyalar hiçbir zaman çalıştırılabilir
 * bir konuma yazılmıyor ve indirilirken {@code attachment} olarak dönüyor.
 */
public final class UploadValidation {

    /** Telefon kamerasından gelen fotoğraflar ve taranmış PDF'ler. */
    public static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf");

    /** 8 MB. Telefon fotoğrafı için fazlasıyla yeterli, yükleme ucunu da korur. */
    public static final long MAX_SIZE_BYTES = 8L * 1024 * 1024;

    private UploadValidation() {}

    public static void validate(String contentType, long size) {
        if (size <= 0) throw badRequest("Dosya boş.");
        if (size > MAX_SIZE_BYTES) {
            throw badRequest("Dosya en fazla %d MB olabilir.".formatted(MAX_SIZE_BYTES / 1024 / 1024));
        }
        if (!ALLOWED_TYPES.contains(normalize(contentType))) {
            throw badRequest("Yalnızca fotoğraf (JPEG, PNG, HEIC, WebP) ya da PDF yükleyebilirsiniz.");
        }
    }

    /** Yalnızca fotoğraf kabul eden akışlar için (teslim kanıtı). */
    public static void validateImage(String contentType, long size) {
        validate(contentType, size);
        if (!normalize(contentType).startsWith("image/")) {
            throw badRequest("Teslim kanıtı fotoğraf olmalı.");
        }
    }

    /**
     * Depo anahtarı. Rastgele bir bileşen taşıyor: anahtar tahmin edilebilir olsaydı ve
     * kova bir gün yanlışlıkla herkese açılsaydı dosyalar sıralanabilir olurdu.
     */
    public static String storageKey(String prefix, String ownerId, String kind) {
        return "%s/%s/%s-%s".formatted(prefix, ownerId, kind.toLowerCase(),
                UUID.randomUUID().toString().replace("-", ""));
    }

    /** İndirilen dosyanın adı; başlıkta kullanılacağı için sadeleştiriliyor. */
    public static String safeFilename(String original, String fallback) {
        if (original == null || original.isBlank()) return fallback;
        return original.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static String normalize(String contentType) {
        return contentType == null ? "" : contentType.toLowerCase().split(";")[0].trim();
    }

    private static ResponseStatusException badRequest(String detail) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, detail);
    }
}
