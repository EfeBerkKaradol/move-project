package com.turmove.api.geo.domain;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.locationtech.jts.geom.Point;

/**
 * İlçe ve yaklaşık merkezi.
 *
 * <p>Merkez koordinatları Google Geocoding gelene kadar geçici mesafe tahmini için
 * kullanılıyor; gerçek adres koordinatları devreye girince yalnızca bölge
 * gösterimi için kalacak.
 */
@Entity
@Table(name = "districts")
@Getter
@NoArgsConstructor
public class DistrictEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 8)
    private String cityCode;

    @Column(nullable = false, length = 32)
    private String cityName;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false, length = 64)
    private String slug;

    @Column(nullable = false, columnDefinition = "geography(Point,4326)")
    private Point centroid;

    @Column(nullable = false)
    private boolean active;
}
