package com.tasiyoruz.api.identity.internal;

import static org.assertj.core.api.Assertions.assertThat;

import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.MutableClock;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;

/**
 * Telefon doğrulamanın güvenlik sınırları.
 *
 * <p>Altı haneli kodun değeri sınırlardan geliyor; sınırlar sessizce işlemezse akış
 * çalışıyor görünür ama koruması kalmaz. Bu yüzden burada mutlu yol kadar
 * reddedilmesi gereken durumlar da sınanıyor.
 */
@Import(RecordingSmsSender.class)
class PhoneVerificationTest extends IntegrationTestBase {

    @Autowired PhoneVerificationService phones;
    @Autowired RecordingSmsSender sms;
    @Autowired MutableClock clock;

    private String kullanici;

    @BeforeEach
    void hazirla() {
        clock.reset();
        sms.clear();
        kullanici = UUID.randomUUID().toString();
    }

    private static String yeniNumara() {
        // 5 ile başlayan, testler arasında çakışmayan numara
        return "05" + String.format("%09d", Math.abs(UUID.randomUUID().hashCode()) % 1_000_000_000);
    }

    @Test
    void dogruKod_numarayiDogrular() {
        var numara = yeniNumara();
        var baslangic = phones.start(kullanici, numara);
        assertThat(baslangic.outcome()).isEqualTo(PhoneVerificationService.StartOutcome.SENT);

        assertThat(phones.verify(kullanici, sms.lastCode())).isEqualTo(PhoneVerificationService.Result.OK);
        assertThat(phones.verifiedPhone(kullanici)).isPresent();
        assertThat(phones.current(kullanici).verifiedAt()).isNotNull();
    }

    @Test
    void numaraE164OlarakGonderilir_kullaniciNasilYazarsaYazsin() {
        phones.start(kullanici, "0532 111 22 33");
        assertThat(sms.lastPhone()).isEqualTo("+905321112233");
    }

    /**
     * Asıl regresyon: yanlış kod istisna fırlatsaydı işlem geri alınır ve deneme
     * sayacı hiç artmazdı — deneme sınırı sessizce işlevsiz kalırdı.
     */
    @Test
    void yanlisKodDenemeleri_sayilirVeAltinciDenemeReddedilir() {
        phones.start(kullanici, yeniNumara());
        var dogruKod = sms.lastCode();

        for (int i = 1; i <= 5; i++) {
            assertThat(phones.verify(kullanici, "000000"))
                    .as("%d. yanlış deneme", i)
                    .isEqualTo(PhoneVerificationService.Result.WRONG_CODE);
        }
        // Sınır dolduktan sonra doğru kod bile kabul edilmiyor
        assertThat(phones.verify(kullanici, dogruKod))
                .isEqualTo(PhoneVerificationService.Result.TOO_MANY_ATTEMPTS);
        assertThat(phones.verifiedPhone(kullanici)).isEmpty();
    }

    @Test
    void besDakikaSonra_kodGecersiz() {
        phones.start(kullanici, yeniNumara());
        var kod = sms.lastCode();

        clock.advance(Duration.ofMinutes(5).plusSeconds(1));

        assertThat(phones.verify(kullanici, kod)).isEqualTo(PhoneVerificationService.Result.EXPIRED);
        assertThat(phones.verifiedPhone(kullanici)).isEmpty();
    }

    @Test
    void saatteUcKod_sonrasiReddedilir() {
        var numara = yeniNumara();
        for (int i = 1; i <= 3; i++) {
            assertThat(phones.start(kullanici, numara).outcome())
                    .isEqualTo(PhoneVerificationService.StartOutcome.SENT);
        }
        assertThat(phones.start(kullanici, numara).outcome())
                .isEqualTo(PhoneVerificationService.StartOutcome.TOO_MANY_REQUESTS);
        assertThat(sms.count()).as("dördüncü istek için SMS gönderilmemeli").isEqualTo(3);

        clock.advance(Duration.ofHours(1).plusMinutes(1));
        assertThat(phones.start(kullanici, numara).outcome())
                .isEqualTo(PhoneVerificationService.StartOutcome.SENT);
    }

    /**
     * Başkasının doğrulanmış numarası için kod gönderilmiyor: gönderilseydi sistem,
     * girilen numaranın kayıtlı olup olmadığını SMS ile sızdırırdı.
     */
    @Test
    void baskasininNumarasi_kodGondermedenReddedilir() {
        var numara = yeniNumara();
        phones.start(kullanici, numara);
        phones.verify(kullanici, sms.lastCode());

        var baskaKullanici = UUID.randomUUID().toString();
        sms.clear();
        assertThat(phones.start(baskaKullanici, numara).outcome())
                .isEqualTo(PhoneVerificationService.StartOutcome.PHONE_TAKEN);
        assertThat(sms.count()).isZero();
    }

    @Test
    void gecersizNumara_kodGondermedenReddedilir() {
        assertThat(phones.start(kullanici, "0312 123 45 67").outcome())
                .isEqualTo(PhoneVerificationService.StartOutcome.INVALID_PHONE);
        assertThat(sms.count()).isZero();
    }

    @Test
    void numaraDegistirilebilir_eskisininYerineGecer() {
        var ilk = yeniNumara();
        phones.start(kullanici, ilk);
        phones.verify(kullanici, sms.lastCode());
        var ilkKayitli = phones.verifiedPhone(kullanici).orElseThrow();

        clock.advance(Duration.ofHours(2));
        var ikinci = yeniNumara();
        phones.start(kullanici, ikinci);
        assertThat(phones.verify(kullanici, sms.lastCode())).isEqualTo(PhoneVerificationService.Result.OK);

        assertThat(phones.verifiedPhone(kullanici)).isPresent().get().isNotEqualTo(ilkKayitli);
    }
}
