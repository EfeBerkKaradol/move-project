/**
 * Sipariş yaşam döngüsü, durum makinesi ve iptal politikası.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Sipariş",
        allowedDependencies = { "catalog", "geo", "pricing", "identity" }
)
package com.turmove.api.ordering;
