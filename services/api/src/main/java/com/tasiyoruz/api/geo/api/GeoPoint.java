package com.tasiyoruz.api.geo.api;

/** WGS84 koordinat. */
public record GeoPoint(double lat, double lng) {

    public GeoPoint {
        if (lat < -90 || lat > 90) throw new IllegalArgumentException("Geçersiz enlem: " + lat);
        if (lng < -180 || lng > 180) throw new IllegalArgumentException("Geçersiz boylam: " + lng);
    }
}
