package com.tasiyoruz.api.trustboard.api;

/**
 * Bir araç tipinde kayıtlı, belgeleri doğrulanmış taşıyıcı sayısı.
 *
 * <p>Yalnızca kod ve sayı: araç adı, kapasitesi ve sırası katalogdan geliyor.
 * Bu uç katalogu tekrar yayınlasaydı güven panosu katalog modülüne bağımlı
 * olurdu; oysa panonun bildiği tek şey sayılar olmalı.
 *
 * @param vehicleTypeCode katalogdaki kod — "PANELVAN", "KAMYON" …
 * @param carrierCount    o araçla iş alabilecek doğrulanmış taşıyıcı sayısı
 */
public record PublicFleetCountView(String vehicleTypeCode, long carrierCount) {}
