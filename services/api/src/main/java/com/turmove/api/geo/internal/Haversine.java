package com.turmove.api.geo.internal;

import com.turmove.api.geo.api.GeoPoint;

/** Küresel yaklaşımla iki nokta arası kuş uçuşu mesafe. */
final class Haversine {

    private static final double EARTH_RADIUS_METERS = 6_371_000;

    private Haversine() {}

    static double meters(GeoPoint a, GeoPoint b) {
        double dLat = Math.toRadians(b.lat() - a.lat());
        double dLng = Math.toRadians(b.lng() - a.lng());
        double lat1 = Math.toRadians(a.lat());
        double lat2 = Math.toRadians(b.lat());

        double h = Math.pow(Math.sin(dLat / 2), 2)
                + Math.pow(Math.sin(dLng / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
        return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
    }
}
