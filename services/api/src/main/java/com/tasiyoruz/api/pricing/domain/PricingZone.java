package com.tasiyoruz.api.pricing.domain;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * İlçenin fiyatlandırma bölgesi (V22). İstanbul için yaka: EUROPE / ASIA.
 *
 * <p>Koordinattan türetilmiyor. Boğaz düz bir çizgi değil — Sarıyer (Avrupa) ile
 * Beykoz (Anadolu) boylamda yan yana, bir eşik ikisini de yanlış sınıflar.
 * Kullanıcıya "hangi yakadasın?" diye de sorulmuyor; ilçeyi zaten seçiyor.
 */
@Entity
@Table(name = "pricing_zones")
@Getter
@NoArgsConstructor
public class PricingZone {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 8)
    private String cityCode;

    @Column(nullable = false, length = 64)
    private String districtSlug;

    @Column(nullable = false, length = 16)
    private String zoneCode;
}
