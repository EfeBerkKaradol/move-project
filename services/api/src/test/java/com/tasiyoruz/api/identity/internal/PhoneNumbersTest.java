package com.tasiyoruz.api.identity.internal;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Aynı numaranın farklı yazımları tek biçime indirgenmeli.
 *
 * <p>İndirgenmezse "bu numara zaten kayıtlı" kontrolü işlemez: aynı kişi
 * {@code 0532...} ve {@code +90532...} yazarak iki hesap doğrulayabilir.
 */
class PhoneNumbersTest {

    @Test
    void ayniNumaraninTumYazimlari_ayniDegereIndirgenir() {
        var beklenen = "+905321234567";
        assertThat(PhoneNumbers.normalize("0532 123 45 67")).contains(beklenen);
        assertThat(PhoneNumbers.normalize("05321234567")).contains(beklenen);
        assertThat(PhoneNumbers.normalize("+90 532 123 45 67")).contains(beklenen);
        assertThat(PhoneNumbers.normalize("905321234567")).contains(beklenen);
        assertThat(PhoneNumbers.normalize("5321234567")).contains(beklenen);
        assertThat(PhoneNumbers.normalize("(0532) 123-45-67")).contains(beklenen);
    }

    @Test
    void cepOlmayanVeEksikNumaralar_reddedilir() {
        // Sabit hat: SMS gitmez, doğrulama hiç tamamlanamaz
        assertThat(PhoneNumbers.normalize("0312 123 45 67")).isEmpty();
        assertThat(PhoneNumbers.normalize("532 123 45")).isEmpty();
        assertThat(PhoneNumbers.normalize("05321234567890")).isEmpty();
        assertThat(PhoneNumbers.normalize("")).isEmpty();
        assertThat(PhoneNumbers.normalize(null)).isEmpty();
    }

    @Test
    void gosterimBiciminde_okunabilirGruplar() {
        assertThat(PhoneNumbers.display("+905321234567")).isEqualTo("+90 532 123 45 67");
    }

    @Test
    void maskeliGosterimSonIkiHaneyiBirakiyor() {
        // Teyit için son haneler yetiyor: "aradığım numara bu mu?" cevaplanabiliyor
        assertThat(PhoneNumbers.mask("+905321234567")).isEqualTo("+90 5** *** ** 67");
    }

    @Test
    void maskeOperatorKodunuGizliyor() {
        // 532 ile 555 aynı görünmeli; operatör kodu kişiyi daraltan bir bilgi
        assertThat(PhoneNumbers.mask("+905321234567"))
                .isEqualTo(PhoneNumbers.mask("+905551234567"));
    }

    @Test
    void maskeAbonenumarasindanSonIkiHaneDisindaBirSeyBirakmiyor() {
        var maskeli = PhoneNumbers.mask("+905321234567");
        // Görünen rakamlar: +90, cep numarasını belli eden 5, ve son iki hane.
        // İlk üçü Türkiye'deki her cep numarasında aynı — kişiyi daraltmıyor.
        assertThat(maskeli.replaceAll("[^0-9]", "")).isEqualTo("90567");
        assertThat(maskeli).doesNotContain("32").doesNotContain("123").doesNotContain("45");
        assertThat(maskeli).endsWith("67");
    }

    @Test
    void bozukNumarada_cokmuyor() {
        assertThat(PhoneNumbers.mask(null)).isNull();
        assertThat(PhoneNumbers.mask("")).isEmpty();
        assertThat(PhoneNumbers.mask("12")).isEqualTo("12");
    }
}
