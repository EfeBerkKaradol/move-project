package com.turmove.api.pricing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.turmove.api.IntegrationTestBase;
import com.turmove.api.geo.api.GeoService;
import com.turmove.api.pricing.api.PricingService;
import com.turmove.api.pricing.api.Quote;
import com.turmove.api.pricing.api.QuoteRequest;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Fiyat motorunun davranış testleri. Tarife değerleri geçici olduğu için mutlak
 * tutar yerine <em>kurallar</em> doğrulanıyor: döküm toplamı, komisyon satırının
 * varlığı, minimum ücret, kademeli mesafe ve şehirlerarası reddi.
 */
class PricingServiceTest extends IntegrationTestBase {

    @Autowired PricingService pricing;
    @Autowired GeoService geo;

    private String districtId(String cityCode, String slug) {
        return geo.districtsOf(cityCode).stream()
                .filter(d -> d.slug().equals(slug))
                .findFirst()
                .orElseThrow(() -> new AssertionError("İlçe bulunamadı: " + slug))
                .id();
    }

    private QuoteRequest request(String cityCode, String from, String to, String vehicle) {
        return new QuoteRequest(
                "INSTANT",
                vehicle,
                List.of(
                        new QuoteRequest.Stop(districtId(cityCode, from), 0, true),
                        new QuoteRequest.Stop(districtId(cityCode, to), 0, true)),
                List.of(),
                null);
    }

    @Test
    void dokumToplamiGenelToplamaEsit() {
        var quote = pricing.quote(request("34", "kadikoy", "besiktas", "TRANSPORTER"));

        var sum = quote.breakdown().stream()
                .map(l -> l.amount().amount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(sum).isEqualByComparingTo(quote.totalAmount().amount());
    }

    @Test
    void komisyonSatiriSifirOlsaBileGorunur() {
        var quote = pricing.quote(request("34", "kadikoy", "besiktas", "TRANSPORTER"));

        var commission = quote.breakdown().stream()
                .filter(l -> l.code().equals("COMMISSION"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Komisyon satırı yok"));

        assertThat(commission.amount().amount()).isEqualByComparingTo("0.00");
        assertThat(commission.note()).contains("komisyon alınmıyor");
    }

    @Test
    void takribiMesafeKullaniciyaBildirilir() {
        var quote = pricing.quote(request("34", "kadikoy", "besiktas", "TRANSPORTER"));

        assertThat(quote.approximateDistance()).isTrue();
        assertThat(quote.breakdown())
                .filteredOn(l -> l.code().equals("DISTANCE"))
                .singleElement()
                .satisfies(l -> assertThat(l.note()).contains("Takribî"));
    }

    @Test
    void buyukAracDahaPahali() {
        var doblo = pricing.quote(request("34", "kadikoy", "besiktas", "DOBLO"));
        var kamyon = pricing.quote(request("34", "kadikoy", "besiktas", "KAMYON"));

        assertThat(kamyon.totalAmount().amount()).isGreaterThan(doblo.totalAmount().amount());
    }

    @Test
    void cokKisaMesafedeMinimumUcretUygulanir() {
        // Aynı ilçeden aynı ilçeye: mesafe sıfıra yakın, taban + süre minimumun altında kalır
        var quote = pricing.quote(request("34", "kadikoy", "kadikoy", "MOTOR"));

        assertThat(quote.totalAmount().amount()).isGreaterThanOrEqualTo(new BigDecimal("172.50"));
    }

    @Test
    void asansorsuzUstKatOtomatikUcretlendirilir() {
        var withElevator = pricing.quote(request("34", "kadikoy", "besiktas", "TRANSPORTER"));

        var noElevator = pricing.quote(new QuoteRequest(
                "INSTANT",
                "TRANSPORTER",
                List.of(
                        new QuoteRequest.Stop(districtId("34", "kadikoy"), 4, false),
                        new QuoteRequest.Stop(districtId("34", "besiktas"), 0, true)),
                List.of(),
                null));

        assertThat(noElevator.totalAmount().amount())
                .isGreaterThan(withElevator.totalAmount().amount());
        assertThat(noElevator.breakdown()).anyMatch(l -> l.code().equals("NO_ELEVATOR"));
    }

    @Test
    void hatayIlIcindeKademeliMesafeUygulanir() {
        // Antakya → İskenderun ~60 km. Kademeli ücret olmasaydı sabit km ücretiyle
        // hesaplanan tutar çıkardı; kademeler devredeyse belirgin şekilde düşük olmalı.
        var uzun = pricing.quote(request("31", "antakya", "iskenderun", "KAMYONET"));
        var kisa = pricing.quote(request("31", "antakya", "defne", "KAMYONET"));

        var uzunKm = uzun.distanceMeters() / 1000.0;
        var kisaKm = kisa.distanceMeters() / 1000.0;

        var uzunKmBasi = uzun.totalAmount().amount().doubleValue() / uzunKm;
        var kisaKmBasi = kisa.totalAmount().amount().doubleValue() / kisaKm;

        assertThat(uzunKm).isGreaterThan(40);
        assertThat(uzunKmBasi).isLessThan(kisaKmBasi);
    }

    @Test
    void sehirlerarasiTasimaReddedilir() {
        var request = new QuoteRequest(
                "INSTANT",
                "TRANSPORTER",
                List.of(
                        new QuoteRequest.Stop(districtId("34", "kadikoy"), 0, true),
                        new QuoteRequest.Stop(districtId("06", "cankaya"), 0, true)),
                List.of(),
                null);

        assertThatThrownBy(() -> pricing.quote(request))
                .hasMessageContaining("Şehirler arası taşıma henüz desteklenmiyor");
    }

    @Test
    void pazarlikTabaniReferansinYuzde70i() {
        var quote = pricing.quote(request("34", "kadikoy", "besiktas", "TRANSPORTER"));

        var expected = quote.totalAmount().amount()
                .multiply(new BigDecimal("0.70"))
                .setScale(2, java.math.RoundingMode.HALF_UP);

        assertThat(quote.floorPrice().amount()).isEqualByComparingTo(expected);
    }

    @Test
    void teklifImzalanmisVeSuresiVar() {
        var quote = pricing.quote(request("34", "kadikoy", "besiktas", "TRANSPORTER"));

        assertThat(quote.signature()).startsWith("v1:");
        assertThat(quote.expiresAt()).isAfter(java.time.Instant.now());
        assertThat(quote.quoteId()).startsWith("qt_");
    }

    @Test
    void ekHizmetDokumeSatirOlarakEklenir() {
        var quote = pricing.quote(new QuoteRequest(
                "INSTANT",
                "TRANSPORTER",
                List.of(
                        new QuoteRequest.Stop(districtId("34", "kadikoy"), 0, true),
                        new QuoteRequest.Stop(districtId("34", "besiktas"), 0, true)),
                List.of("PORTERAGE", "PACKAGING"),
                null));

        assertThat(quote.breakdown()).anyMatch(l -> l.code().equals("PORTERAGE"));
        assertThat(quote.breakdown()).anyMatch(l -> l.code().equals("PACKAGING"));

        var sum = quote.breakdown().stream()
                .map(l -> l.amount().amount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(sum).isEqualByComparingTo(quote.totalAmount().amount());
    }
}
