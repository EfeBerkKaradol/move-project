/**
 * Sipariş yaşam döngüsü, durum makinesi ve iptal politikası.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Sipariş",
        allowedDependencies = { "catalog::api", "geo::api", "pricing::api", "identity" }
)
package com.turmove.api.ordering;
