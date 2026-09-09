package com.tasiyoruz.api.pricing.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Yaka bazlı şehir içi tarife (V22).
 *
 * <p>Rota dört şeyle anahtarlanıyor: şehir, araç, yaka çifti ve mesafe sınıfı.
 * Yaka çifti ayrı bir boyut çünkü köprü geçişi İstanbul'da mesafeden bağımsız
 * bir maliyet — 8 km'lik bir Boğaz geçişi, 20 km'lik yaka içi işten pahalı.
 *
 * <p>Kademeli km yok: kısa ve uzun için ayrı taban ve ayrı km ücreti var, uzun
 * rotanın km'si zaten daha ucuz. Şehir içinde iki kademe yetiyor; şehirlerarası
 * taşıma eski {@link RateCard} yolundan devam ediyor.
 */
@Entity
@Table(name = "zone_rate_cards")
@Getter
@NoArgsConstructor
public class ZoneRateCard {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 8)
    private String cityCode;

    @Column(nullable = false, length = 32)
    private String vehicleTypeCode;

    @Column(nullable = false, length = 16)
    private String originZone;

    @Column(nullable = false, length = 16)
    private String destinationZone;

    /** SHORT ya da LONG; eşik {@link ZonePricingSettings} içinde. */
    @Column(nullable = false, length = 8)
    private String distanceClass;

    @Column(nullable = false)
    private BigDecimal baseFare;

    @Column(nullable = false)
    private BigDecimal perKmRate;

    @Column(nullable = false)
    private BigDecimal minimumFare;

    /**
     * Yaka değiştiren rotada köprü/otoyol karşılığı. Sabit, çünkü rota servisi
     * şu an gerçek geçiş ücretini döndürmüyor; döndürdüğünde bu alan onun
     * yerini bırakacak (bkz. RouteProvider, ANAHTARLAR.md #1).
     */
    @Column(nullable = false)
    private BigDecimal crossingFee;

    @Column(nullable = false)
    private Integer version;

    @Column(nullable = false)
    private boolean active;
}
