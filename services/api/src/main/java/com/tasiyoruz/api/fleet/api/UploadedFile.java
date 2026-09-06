package com.tasiyoruz.api.fleet.api;

import java.io.InputStream;

/**
 * Yüklenen dosyanın servise taşınan hâli.
 *
 * <p>Servis {@code MultipartFile} almıyor: web katmanı tipi domain'e sızsaydı belge
 * yükleme yalnızca HTTP üzerinden test edilebilirdi.
 */
public record UploadedFile(String originalFilename, String contentType, long size, InputStream content) {}
