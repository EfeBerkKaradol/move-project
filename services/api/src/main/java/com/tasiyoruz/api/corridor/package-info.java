/**
 * Boş dönüş (koridor) eşleştirme — docs/11 §3.
 *
 * <p>Araç sahibi dönüş rotasını koridor olarak tanımlar; yeni bir ilan yayınlandığında
 * koridora düşen ilanlar puanlanıp ona getirilir. Modül pazar yerini dinler, ona
 * yazmaz: teklifi yine taşıyıcı kendisi verir.
 */
@org.springframework.modulith.ApplicationModule(
        displayName = "Boş dönüş koridorları",
        allowedDependencies = { "catalog::api", "geo::api", "ordering::api", "pricing::api" }
)
package com.tasiyoruz.api.corridor;
