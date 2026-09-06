package com.tasiyoruz.api.tracking.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Teslim kanıtı.
 *
 * <p>Fotoğraf burada değil: teslim bildirilmeden önce ayrı uçtan yükleniyor ve
 * {@code DELIVERED} geçişi en az bir teslim fotoğrafı istiyor. Fotoğrafı bu isteğin
 * içinde taşımak, yükleme yarıda kalınca teslim bildirimini de kaybettirirdi.
 */
public record ProofOfDeliveryRequest(
        @NotBlank @Size(max = 120) String receivedByName,
        @Size(max = 500) String note) {}
