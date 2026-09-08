package com.tasiyoruz.api.fleet.api;

import jakarta.validation.constraints.*;

/**
 * Başvuru formu (docs/01 FR-2.1).
 *
 * <p>Plaka biçimi Türkiye plakalarına göre doğrulanıyor; serbest metin kabul edilseydi
 * ruhsat eşleştirmesi operasyon tarafında elle yapılırdı.
 */
public record CarrierApplicationRequest(
        @NotBlank @Size(max = 120) String displayName,
        @Pattern(regexp = "^(\\+90|0)?5\\d{9}$", message = "Telefon 5xx xxx xx xx biçiminde olmalı")
        String phone,
        @Size(max = 160) String companyName,
        @Pattern(regexp = "^\\d{10,11}$", message = "Vergi numarası 10, TCKN 11 hane olmalı")
        String taxId,
        @NotBlank String vehicleTypeCode,
        @NotBlank
        // Küçük harf de kabul ediliyor: kayıt sırasında büyütülüyor. Yalnızca büyük
        // harf istenseydi "34 abc 123" yazan kullanıcı, alan ekranda büyük harf
        // göründüğü hâlde anlamsız bir hatayla karşılaşırdı.
        @Pattern(regexp = "^\\d{2} ?[A-Za-z]{1,3} ?\\d{2,5}$",
                message = "Plaka 34 ABC 123 biçiminde olmalı")
        String plate,
        /**
         * Taşıyıcının mevzuata uygunluk taahhüdü.
         *
         * <p>Başvuruda alınıyor: taşıyıcı bir kez onaylanıp uzun süre çalışıyor,
         * beyanı her taşımada tekrar istemek anlamsız bir sürtünme olurdu. Araç
         * tipi değişip başvuru taslağa döndüğünde yeniden isteniyor.
         */
        @AssertTrue(message = "Mevzuata uygunluk taahhüdünü onaylaman gerekiyor.")
        boolean complianceDeclared) {

    /** Kurumsal başvuruda vergi numarası zorunlu (veritabanı kısıtıyla da tutuluyor). */
    @AssertTrue(message = "Firma unvanı girildiyse vergi numarası da gerekli")
    public boolean isCompanyConsistent() {
        return companyName == null || companyName.isBlank() || (taxId != null && !taxId.isBlank());
    }
}
