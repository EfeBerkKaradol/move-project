package com.tasiyoruz.api.geo.api;

/** Hizmet verilen ilçe ve yaklaşık merkezi. */
public record District(String id, String cityCode, String cityName, String name, String slug,
                       double lat, double lng) {}
