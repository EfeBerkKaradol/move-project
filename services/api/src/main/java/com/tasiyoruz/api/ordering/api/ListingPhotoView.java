package com.tasiyoruz.api.ordering.api;

import java.time.Instant;

/**
 * Yük fotoğrafının üstverisi. Dosyanın kendisi ayrı bir uçtan, kimlik doğrulaması
 * arkasında akıyor; anahtar hiçbir zaman istemciye verilmiyor.
 */
public record ListingPhotoView(String id, long sizeBytes, Instant uploadedAt) {}
