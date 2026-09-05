package com.tasiyoruz.api.geo.api;

import java.util.List;
import java.util.Optional;

/** Coğrafya modülünün dışa açık yüzü. */
public interface GeoService {

    List<District> districts();

    List<District> districtsOf(String cityCode);

    Optional<District> district(String id);

    /** Verilen nokta hizmet bölgesinde mi? */
    boolean inServiceArea(GeoPoint point);
}
