package com.tasiyoruz.api.geo.internal;

import com.tasiyoruz.api.geo.api.District;
import com.tasiyoruz.api.geo.domain.DistrictEntity;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

/**
 * İlçe listesinin önbellekli sarmalayıcısı.
 *
 * <p>Ayrı bean: {@code @Cacheable} aynı sınıf içinden çağrıldığında (self-invocation)
 * proxy devreye girmez ve önbellek sessizce çalışmaz.
 */
@Component
class DistrictCache {

    private final DistrictRepository districts;

    DistrictCache(DistrictRepository districts) {
        this.districts = districts;
    }

    @Cacheable("districts")
    List<District> all() {
        return districts.findByActiveTrueOrderByCityNameAscNameAsc().stream()
                .map(DistrictCache::toDto)
                .toList();
    }

    static District toDto(DistrictEntity e) {
        return new District(
                e.getId().toString(),
                e.getCityCode(),
                e.getCityName(),
                e.getName(),
                e.getSlug(),
                e.getCentroid().getY(),
                e.getCentroid().getX());
    }
}
