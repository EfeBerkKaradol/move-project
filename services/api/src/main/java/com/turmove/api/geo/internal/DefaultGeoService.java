package com.turmove.api.geo.internal;

import com.turmove.api.geo.api.District;
import com.turmove.api.geo.api.GeoPoint;
import com.turmove.api.geo.api.GeoService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
class DefaultGeoService implements GeoService {

    /** Bir noktanın hizmet bölgesinde sayılması için en yakın ilçe merkezine uzaklık sınırı. */
    private static final double SERVICE_RADIUS_METERS = 60_000;

    private final DistrictRepository districts;
    private final DistrictCache cache;

    DefaultGeoService(DistrictRepository districts, DistrictCache cache) {
        this.districts = districts;
        this.cache = cache;
    }

    @Override
    public List<District> districts() {
        return cache.all();
    }

    @Override
    public List<District> districtsOf(String cityCode) {
        return cache.all().stream().filter(d -> d.cityCode().equals(cityCode)).toList();
    }

    @Override
    public Optional<District> district(String id) {
        try {
            UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        return cache.all().stream().filter(d -> d.id().equals(id)).findFirst();
    }

    @Override
    public boolean inServiceArea(GeoPoint point) {
        return districts().stream()
                .anyMatch(d -> Haversine.meters(point, new GeoPoint(d.lat(), d.lng()))
                        <= SERVICE_RADIUS_METERS);
    }

}
