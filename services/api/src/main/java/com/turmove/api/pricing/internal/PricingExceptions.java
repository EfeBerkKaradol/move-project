package com.turmove.api.pricing.internal;

/** Fiyatlandırma sırasında oluşabilecek, kullanıcıya anlamlı mesaj dönen durumlar. */
class NoRateCardException extends RuntimeException {
    NoRateCardException(String cityCode, String vehicleTypeCode) {
        super("Bu şehir ve araç tipi için tarife tanımlı değil: %s / %s"
                .formatted(cityCode, vehicleTypeCode));
    }
}

class OutOfServiceAreaException extends RuntimeException {
    OutOfServiceAreaException(String districtId) {
        super("Bu adres henüz hizmet bölgemizde değil: " + districtId);
    }
}

class InterCityNotSupportedException extends RuntimeException {
    InterCityNotSupportedException() {
        super("Şehirler arası taşıma henüz desteklenmiyor. Alış ve teslim aynı ilde olmalı.");
    }
}
