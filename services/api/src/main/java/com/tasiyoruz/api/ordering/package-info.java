/**
 * Teklif pazarı: yük ilanı (LoadListing) ve araç sahibi teklifi (CarrierOffer).
 *
 * <p>Önceki plandaki anlık dispatch yerine tek turlu teklif akışı (docs/11 §2).
 * İlan AWARDED olduğunda taşıma yürütme (tracking) devreye girer.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Pazar yeri",
        allowedDependencies = { "catalog::api", "compliance::api", "fleet::api", "geo::api", "pricing::api",
                                "identity::api", "shared::storage" }
)
package com.tasiyoruz.api.ordering;
