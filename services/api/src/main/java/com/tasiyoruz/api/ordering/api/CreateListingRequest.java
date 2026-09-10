package com.tasiyoruz.api.ordering.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

/**
 * Yük ilanı isteği. Fiyat tahmini istemciden alınmaz: sunucu aynı girdiyle tarifeyi
 * yeniden hesaplar ve ilana snapshot olarak yazar. Böylece referans fiyatı istemci
 * belirleyemez.
 *
 * <p>Beyan ve fotoğraf zorunlu. Serbest metin tek başına teklif için yetmiyordu:
 * araç sahibi hacmi ve kaç kişi gerektiğini tahmin etmek zorunda kalıyor, tahmin
 * tutmayınca iş kapıda bozuluyordu. Zorunluluk sunucuda: istemci doğrulaması
 * atlanabilir, ilan ise beyansız var olamamalı.
 */
public record CreateListingRequest(
        @NotBlank String serviceModel,
        @NotBlank String vehicleTypeCode,
        @NotNull @Valid Stop pickup,
        @NotNull @Valid Stop dropoff,
        List<String> extraServices,
        @NotEmpty(message = "Yükünü kalem kalem seçmelisin.")
        @Size(max = 60, message = "En fazla 60 kalem seçebilirsin.")
        List<@Valid ItemLine> cargoItems,
        @NotEmpty(message = "Yükünün en az bir fotoğrafını yüklemelisin.")
        @Size(max = 10, message = "En fazla 10 fotoğraf yükleyebilirsin.")
        List<String> photoIds,
        /**
         * Göndericinin hukuka uygunluk beyanı.
         *
         * <p>İşlem bazında alınıyor, kayıt sırasında bir kez değil: beyan taşınan
         * <em>bu</em> yüke ait. Bir kez kabul edilip unutulan bir onay kutusu,
         * hangi yük için ne beyan edildiğini söyleyemez.
         */
        @AssertTrue(message = "Eşyanın hukuka uygunluğuna dair beyanı onaylaman gerekiyor.")
        boolean lawfulnessDeclared,
        @Size(max = 1000) String cargoDescription,
        Instant pickupWindowStart,
        Instant pickupWindowEnd) {

    public record Stop(
            @NotBlank String districtId,
            /** Kullanıcının seçtiği mahalle/semt; isteğe bağlı, adres değil. */
            @jakarta.validation.constraints.Size(max = 96) String neighborhood,
            @Min(0) @Max(50) Integer floor,
            Boolean hasElevator) {

        /**
         * Semtsiz durak. Semt isteğe bağlı: kullanıcı adres alanına yalnızca ilçe
         * yazmış olabilir, ve fiyat sorgusu gibi semtin hiç rol oynamadığı
         * çağrılar da var.
         */
        public Stop(String districtId, Integer floor, Boolean hasElevator) {
            this(districtId, null, floor, hasElevator);
        }
    }

    /** Katalogdan seçilmiş bir kalem ve adedi. */
    public record ItemLine(
            @NotBlank String cargoItemCode,
            @Min(1) @Max(99) int quantity) {}

    public List<String> extraServicesOrEmpty() {
        return extraServices == null ? List.of() : extraServices;
    }
}
