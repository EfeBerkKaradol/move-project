package com.tasiyoruz.api.finance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tasiyoruz.api.IntegrationTestBase;
import com.tasiyoruz.api.finance.api.FinanceEnums.PayoutStatus;
import com.tasiyoruz.api.finance.api.FinanceEnums.TransactionType;
import com.tasiyoruz.api.finance.api.FinanceService;
import com.tasiyoruz.api.pricing.api.Money;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Paranın kuralları.
 *
 * <p>Bu testlerin işi biçim değil <em>muhasebe</em> korumak: komisyon ile hakediş
 * brütü vermezse, defter dengesizse ya da teslim edilmemiş iş ödenebilir olursa
 * kimse fark etmeden para yanlış hesaplanır.
 */
class FinanceServiceTest extends IntegrationTestBase {

    @Autowired FinanceService finance;
    @Autowired jakarta.persistence.EntityManager em;

    private String yeniIlan() {
        return UUID.randomUUID().toString();
    }

    /**
     * Kabul senaryosu: brüt, komisyon ve hakediş birbirine eşit çıkmalı.
     *
     * <p>Oran yürürlükteki konfigürasyondan geliyor (şu an %0) — teste sabit
     * yazılmadı. Sabit yazılsaydı oran değiştiğinde test, ürünün doğru
     * çalıştığını değil eski oranı korumuş olurdu.
     */
    @Test
    void brutKomisyonVeHakedisBirbiriniTutar() {
        var ilan = yeniIlan();
        var ozet = finance.openForAward(ilan, "shipper-1", "carrier-1", Money.tryOf(new BigDecimal("10000.00")));

        assertThat(ozet.grossAmount().amount()).isEqualByComparingTo("10000.00");
        // Komisyon + hakediş = brüt. Oran ne olursa olsun bu eşitlik bozulmamalı.
        assertThat(ozet.commissionAmount().amount().add(ozet.carrierPayout().amount()))
                .isEqualByComparingTo(ozet.grossAmount().amount());
        // Platformun geliri brütün tamamı DEĞİL
        assertThat(ozet.platformRevenue().amount()).isEqualByComparingTo(ozet.commissionAmount().amount());
        assertThat(finance.reconcile(ilan).balanced()).isTrue();
    }

    /** Komisyon oranı hesabı: %15'te 10.000 → 1.500 / 8.500. */
    @Test
    void komisyonOraniDogruUygulanir() {
        var ozet = finance.openForAward(yeniIlan(), "s", "c", Money.tryOf(new BigDecimal("10000.00")));
        var beklenenKomisyon = new BigDecimal("10000.00")
                .multiply(ozet.commissionRate())
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        assertThat(ozet.commissionAmount().amount()).isEqualByComparingTo(beklenenKomisyon);
        assertThat(ozet.carrierPayout().amount())
                .isEqualByComparingTo(new BigDecimal("10000.00").subtract(beklenenKomisyon));
    }

    /**
     * Defter çift taraflı: her hareketin borcu alacağına eşit.
     *
     * <p>Brüt hareket tek satır yazsaydı "10.000 TL gelir elde edildi" diye
     * okunurdu; oysa karşı taraf taşıyıcıya borç ve komisyon geliri olarak
     * ikiye ayrılıyor.
     */
    @Test
    void defterDengeli() {
        var ilan = yeniIlan();
        finance.openForAward(ilan, "s", "c", Money.tryOf(new BigDecimal("7500.00")));
        var sonuc = finance.reconcile(ilan);
        assertThat(sonuc.balanced()).isTrue();
        assertThat(sonuc.ledgerDebit()).isEqualByComparingTo(sonuc.ledgerCredit());
        assertThat(sonuc.problems()).isEmpty();
    }

    /** Olay iki kez gelirse ciro iki katına çıkmamalı. */
    @Test
    void mukerrerOlayIkinciKaydiAcmaz() {
        var ilan = yeniIlan();
        finance.openForAward(ilan, "s", "c", Money.tryOf(new BigDecimal("5000.00")));
        finance.openForAward(ilan, "s", "c", Money.tryOf(new BigDecimal("5000.00")));

        var brutler = finance.transactions(ilan).stream()
                .filter(t -> t.type() == TransactionType.GROSS_SHIPMENT)
                .toList();
        assertThat(brutler).hasSize(1);
        assertThat(finance.shipmentFinance(ilan).orElseThrow().grossAmount().amount())
                .isEqualByComparingTo("5000.00");
    }

    /** Teslim edilmemiş iş ödenebilir olmaz. */
    @Test
    void teslimEdilmemisIsHakedisOdenebilirDegil() {
        var ilan = yeniIlan();
        finance.openForAward(ilan, "s", "carrier-bekleyen", Money.tryOf(new BigDecimal("3000.00")));

        var hakedis = finance.payoutsOfCarrier("carrier-bekleyen").stream()
                .filter(p -> p.listingId().equals(ilan)).findFirst().orElseThrow();
        assertThat(hakedis.status()).isEqualTo(PayoutStatus.PENDING);
    }

    @Test
    void teslimSonrasiHakedisOdenebilirOlur() {
        var ilan = yeniIlan();
        finance.openForAward(ilan, "s", "carrier-teslim", Money.tryOf(new BigDecimal("3000.00")));
        finance.markDelivered(ilan, UUID.randomUUID().toString());

        var hakedis = finance.payoutsOfCarrier("carrier-teslim").stream()
                .filter(p -> p.listingId().equals(ilan)).findFirst().orElseThrow();
        assertThat(hakedis.status()).isEqualTo(PayoutStatus.ELIGIBLE);
    }

    /**
     * Kısmi iade: brüt DEĞİŞMEZ.
     *
     * <p>İade ayrı bir olay; işlem hacmini geriye dönük silmek olanı olmamış gibi
     * göstermek olurdu. Ayrıca hakediş askıya alınıyor — iade sonrası taşıyıcıya
     * ödenecek tutar yeniden değerlendirilmeli.
     */
    @Test
    void kismiIadeBrutuDegistirmez_hakedisAskiyaAlinir() {
        var ilan = yeniIlan();
        finance.openForAward(ilan, "s", "carrier-iade", Money.tryOf(new BigDecimal("4000.00")));
        var sonra = finance.recordRefund(ilan, Money.tryOf(new BigDecimal("1000.00")), "PARTIAL_SERVICE", "ops-1");

        assertThat(sonra.grossAmount().amount()).isEqualByComparingTo("4000.00");
        assertThat(sonra.refundAmount().amount()).isEqualByComparingTo("1000.00");
        assertThat(sonra.customerTotal().amount()).isEqualByComparingTo("3000.00");
        assertThat(finance.reconcile(ilan).balanced()).isTrue();

        var hakedis = finance.payoutsOfCarrier("carrier-iade").stream()
                .filter(p -> p.listingId().equals(ilan)).findFirst().orElseThrow();
        assertThat(hakedis.status()).isEqualTo(PayoutStatus.ON_HOLD);
    }

    @Test
    void iadeBrutuAsamaz() {
        var ilan = yeniIlan();
        finance.openForAward(ilan, "s", "c", Money.tryOf(new BigDecimal("1000.00")));
        assertThatThrownBy(() ->
                finance.recordRefund(ilan, Money.tryOf(new BigDecimal("1500.00")), "OTHER", "ops"))
                .hasMessageContaining("kalan tutarı aşamaz");
    }

    /** Tam iade sonrası müşteriye kalan yük sıfır. */
    @Test
    void tamIade() {
        var ilan = yeniIlan();
        finance.openForAward(ilan, "s", "c", Money.tryOf(new BigDecimal("2000.00")));
        var sonra = finance.recordRefund(ilan, Money.tryOf(new BigDecimal("2000.00")), "CUSTOMER_CANCELLED", "ops");
        assertThat(sonra.customerTotal().amount()).isEqualByComparingTo("0.00");
        assertThat(finance.reconcile(ilan).balanced()).isTrue();
    }

    /** Finansal kaydı olmayan taşımada mutabakat sessizce "tamam" demez. */
    @Test
    void kaydiOlmayanTasimaDengesizSayilir() {
        var sonuc = finance.reconcile(UUID.randomUUID().toString());
        assertThat(sonuc.balanced()).isFalse();
        assertThat(sonuc.problems()).isNotEmpty();
    }

    /**
     * Spec'in kabul senaryosu, oran GERÇEKTEN %15 iken.
     *
     * <p>Diğer testler yürürlükteki oranı okuyor (şu an %0) ve eşitlikleri
     * koruyor; bu test motorun sıfır dışı bir oranda da doğru hesapladığını
     * gösteriyor. Oran teste özel olarak kuruluyor, koda sabitlenmiyor.
     */
    @Test
    @org.springframework.transaction.annotation.Transactional
    void yuzdeOnBesOraniyla_onBinLira_binBesYuzKomisyon_sekizBinBesYuzHakedis() {
        // Yürürlükteki kaydı kapatıp %15'lik yeni bir dönem açıyoruz
        em.createNativeQuery("UPDATE platform_commission SET valid_to = now() WHERE valid_to IS NULL OR valid_to > now()")
                .executeUpdate();
        em.createNativeQuery("""
                        INSERT INTO platform_commission (id, percent, version, valid_from, valid_to)
                        VALUES (gen_random_uuid(), 15.00, 99, now() - interval '1 hour', now() + interval '1 year')
                        """)
                .executeUpdate();
        em.flush();
        em.clear();

        var ozet = finance.openForAward(yeniIlan(), "s", "c", Money.tryOf(new BigDecimal("10000.00")));

        assertThat(ozet.commissionRate()).isEqualByComparingTo("15.00");
        assertThat(ozet.commissionAmount().amount()).isEqualByComparingTo("1500.00");
        assertThat(ozet.carrierPayout().amount()).isEqualByComparingTo("8500.00");
        assertThat(ozet.platformRevenue().amount()).isEqualByComparingTo("1500.00");
        // Komisyon üzerinden KDV; taşıma bedelinin vergisiyle karıştırılmıyor
        assertThat(ozet.commissionTax().amount()).isEqualByComparingTo("300.00");
        assertThat(finance.reconcile(ozet.listingId()).balanced()).isTrue();
    }

    /** Yönetim özeti ciroyu gelirle karıştırmıyor. */
    @Test
    void ozetCiroyuGelirdenAyirir() {
        finance.openForAward(yeniIlan(), "s", "c", Money.tryOf(new BigDecimal("9000.00")));
        var ozet = finance.summary();

        assertThat(ozet.gmv().amount()).isGreaterThanOrEqualTo(new BigDecimal("9000.00"));
        // Gelir ciroyu aşamaz; aşıyorsa komisyon hesabı bozuk demektir
        assertThat(ozet.platformRevenue().amount()).isLessThanOrEqualTo(ozet.gmv().amount());
        // Tutarsız taşıma olmamalı
        assertThat(ozet.unbalanced()).isZero();
    }
}
