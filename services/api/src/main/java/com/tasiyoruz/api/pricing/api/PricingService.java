package com.tasiyoruz.api.pricing.api;

/** Fiyatlandırma modülünün dışa açık yüzü. */
public interface PricingService {

    Quote quote(QuoteRequest request);
}
