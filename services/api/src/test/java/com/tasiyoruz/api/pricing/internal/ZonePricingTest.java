package com.tasiyoruz.api.pricing.internal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;

/**
 * Yaka bazlı tarifenin hesabı (V22).
 *
 * <p>Veritabanı kurmadan sınanıyor: fiyat kuralı dört sayı ile mesafeden ibaret
 * ve hesabın kendisi ayrı durduğu için doğrudan çağrılabiliyor. Tarife satırının
 * doğru <em>seçildiği</em> ayrı bir mesele — onu {@code PricingServiceTest}
 * gerçek verilerle doğruluyor.
 *
 * <p>Beklenen tutarlar ürün tarafından verilen senaryolardan; burada sınanan şey
 * motorun o senaryoları bire bir üretip üretmediği.
 */
class ZonePricingTest {

    private static final BigDecimal ESIK = new BigDecimal("25");

    // İstanbul tarifesi (V22)
    private static final ZonePricing.Rates PANELVAN_YAKA_ICI_KISA =
            rates(900, 55, 1500, 0);
    private static final ZonePricing.Rates PANELVAN_YAKA_ICI_UZUN =
            rates(1200, 50, 1500, 0);
    private static final ZonePricing.Rates PANELVAN_YAKA_GECIS_KISA =
            rates(1300, 55, 1500, 400);
    private static final ZonePricing.Rates PANELVAN_YAKA_GECIS_UZUN =
            rates(1600, 50, 1500, 400);
    private static final ZonePricing.Rates KAMYON_YAKA_ICI_KISA =
            rates(1800, 85, 3000, 0);
    private static final ZonePricing.Rates KAMYON_YAKA_ICI_UZUN =
            rates(2500, 75, 3000, 0);

    private static ZonePricing.Rates rates(int base, int perKm, int minimum, int crossing) {
        return new ZonePricing.Rates(
                BigDecimal.valueOf(base), BigDecimal.valueOf(perKm),
                BigDecimal.valueOf(minimum), BigDecimal.valueOf(crossing));
    }

    private static BigDecimal toplam(ZonePricing.Rates rates, int km, String from, String to) {
        return ZonePricing.fare(rates, BigDecimal.valueOf(km), null, from, to).total();
    }

    @Nested
    class Senaryolar {

        @Test
        void kisa_yaka_ici_panelvan_minimuma_yukseliyor() {
            // 900 + 10×55 = 1.450 → minimum 1.500
            assertThat(toplam(PANELVAN_YAKA_ICI_KISA, 10, "EUROPE", "EUROPE"))
                    .isEqualByComparingTo("1500");
        }

        @Test
        void kisa_yaka_ici_panelvan() {
            // 900 + 20×55 = 2.000
            assertThat(toplam(PANELVAN_YAKA_ICI_KISA, 20, "EUROPE", "EUROPE"))
                    .isEqualByComparingTo("2000");
        }

        @Test
        void uzun_yaka_ici_panelvan() {
            // 1.200 + 35×50 = 2.950
            assertThat(toplam(PANELVAN_YAKA_ICI_UZUN, 35, "EUROPE", "EUROPE"))
                    .isEqualByComparingTo("2950");
        }

        @Test
        void kisa_yaka_gecisli_panelvan() {
            // 1.300 + 20×55 + 400 = 2.800
            assertThat(toplam(PANELVAN_YAKA_GECIS_KISA, 20, "EUROPE", "ASIA"))
                    .isEqualByComparingTo("2800");
        }

        @Test
        void uzun_yaka_gecisli_panelvan() {
            // 1.600 + 35×50 + 400 = 3.750
            assertThat(toplam(PANELVAN_YAKA_GECIS_UZUN, 35, "EUROPE", "ASIA"))
                    .isEqualByComparingTo("3750");
        }

        @Test
        void kisa_yaka_ici_kamyon() {
            // 1.800 + 20×85 = 3.500
            assertThat(toplam(KAMYON_YAKA_ICI_KISA, 20, "ASIA", "ASIA"))
                    .isEqualByComparingTo("3500");
        }

        @Test
        void uzun_yaka_ici_kamyon() {
            // 2.500 + 40×75 = 5.500
            assertThat(toplam(KAMYON_YAKA_ICI_UZUN, 40, "ASIA", "ASIA"))
                    .isEqualByComparingTo("5500");
        }
    }

    @Nested
    class MesafeSinifi {

        @Test
        void esigin_altindaki_mesafe_kisa() {
            assertThat(ZonePricing.distanceClass(new BigDecimal("12.4"), ESIK)).isEqualTo("SHORT");
            assertThat(ZonePricing.distanceClass(new BigDecimal("24.99"), ESIK)).isEqualTo("SHORT");
        }

        @Test
        void esigin_kendisi_uzun() {
            // Sınırın hangi tarafa düştüğü, 25 km'lik bir rotanın fiyatını
            // doğrudan değiştiriyor; kapalı uç bilerek seçildi
            assertThat(ZonePricing.distanceClass(new BigDecimal("25.00"), ESIK)).isEqualTo("LONG");
            assertThat(ZonePricing.distanceClass(new BigDecimal("38.7"), ESIK)).isEqualTo("LONG");
        }
    }

    @Nested
    class Dokum {

        @Test
        void toplam_dokum_satirlarinin_toplamina_esit() {
            // Gizli kalem yok (FR-5.5): kullanıcı neye ne ödediğini görüyor
            var fare = ZonePricing.fare(PANELVAN_YAKA_GECIS_KISA, BigDecimal.valueOf(20), null,
                    "EUROPE", "ASIA");
            var satirlarinToplami = fare.lines().stream()
                    .map(l -> l.amount().amount())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            assertThat(satirlarinToplami).isEqualByComparingTo(fare.total());
        }

        @Test
        void yaka_gecisi_ayri_satirda_ve_yonu_yaziyor() {
            var fare = ZonePricing.fare(PANELVAN_YAKA_GECIS_KISA, BigDecimal.valueOf(20), null,
                    "EUROPE", "ASIA");
            var gecis = fare.lines().stream().filter(l -> l.code().equals("CROSSING")).findFirst();
            assertThat(gecis).isPresent();
            assertThat(gecis.get().amount().amount()).isEqualByComparingTo("400");
            assertThat(gecis.get().note()).isEqualTo("Avrupa → Anadolu");
        }

        @Test
        void yaka_ici_rotada_gecis_satiri_yok() {
            // Sıfır tutarlı bir satır, ödenmeyen bir ücreti ödeniyormuş gibi gösterirdi
            var fare = ZonePricing.fare(PANELVAN_YAKA_ICI_KISA, BigDecimal.valueOf(20), null,
                    "EUROPE", "EUROPE");
            assertThat(fare.lines()).noneMatch(l -> l.code().equals("CROSSING"));
        }

        @Test
        void minimum_farki_gorunur_satir() {
            var fare = ZonePricing.fare(PANELVAN_YAKA_ICI_KISA, BigDecimal.valueOf(10), null,
                    "EUROPE", "EUROPE");
            var fark = fare.lines().stream()
                    .filter(l -> l.code().equals("MINIMUM_FARE_ADJUSTMENT")).findFirst();
            assertThat(fark).isPresent();
            assertThat(fark.get().amount().amount()).isEqualByComparingTo("50");
        }

        @Test
        void takribi_mesafe_notu_mesafe_satirina_yaziliyor() {
            var fare = ZonePricing.fare(PANELVAN_YAKA_ICI_KISA, BigDecimal.valueOf(20),
                    "Takribî mesafe", "EUROPE", "EUROPE");
            var mesafe = fare.lines().stream().filter(l -> l.code().equals("DISTANCE")).findFirst();
            assertThat(mesafe).isPresent();
            assertThat(mesafe.get().note()).isEqualTo("Takribî mesafe");
        }

        @Test
        void ondalikli_mesafe_kurusa_yuvarlaniyor() {
            // 18,37 × 55 = 1.010,35
            var fare = ZonePricing.fare(PANELVAN_YAKA_ICI_KISA, new BigDecimal("18.37"), null,
                    "EUROPE", "EUROPE");
            assertThat(fare.total()).isEqualByComparingTo("1910.35");
        }
    }

    @Nested
    class SinirDurumlari {

        @Test
        void sifir_mesafe_minimuma_dusuyor() {
            // Aynı binadan alıp aynı binaya bırakmak da bir iş; taban ücret duruyor
            assertThat(toplam(PANELVAN_YAKA_ICI_KISA, 0, "EUROPE", "EUROPE"))
                    .isEqualByComparingTo("1500");
        }

        @Test
        void negatif_mesafe_fiyatlanmiyor() {
            // Bozuk bir rota katmanından gelen değerle sessizce fiyat üretmek,
            // kullanıcının hatırlayıp bize tutacağı yanlış bir rakam demek
            var zonePricing = new ZonePricing(null, null, null);
            assertThatThrownBy(() -> zonePricing.transportFare(
                            "34", "PANELVAN", "kadikoy", "besiktas", new BigDecimal("-1"), null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Mesafe hesaplanamadı");
        }

        @Test
        void mesafe_yoksa_fiyatlanmiyor() {
            var zonePricing = new ZonePricing(null, null, null);
            assertThatThrownBy(() -> zonePricing.transportFare(
                            "34", "PANELVAN", "kadikoy", "besiktas", null, null))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
