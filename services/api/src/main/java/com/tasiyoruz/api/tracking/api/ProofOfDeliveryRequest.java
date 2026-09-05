package com.tasiyoruz.api.tracking.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Teslim kanıtı. Fotoğraf anahtarı nesne depolama (MinIO/S3) bağlanınca dolacak. */
public record ProofOfDeliveryRequest(
        @NotBlank @Size(max = 120) String receivedByName,
        @Size(max = 500) String note,
        @Size(max = 255) String photoKey) {}
