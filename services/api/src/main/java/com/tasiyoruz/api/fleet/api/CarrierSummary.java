package com.tasiyoruz.api.fleet.api;

/**
 * Taşıyıcının modüller arası özeti.
 *
 * <p>Teklif ekranı taşıyıcıyı adıyla ve aracıyla gösteriyor; bu bilgi artık teklif
 * kaydına kopyalanan ada değil, doğrulanmış profile dayanıyor.
 */
public record CarrierSummary(
        String carrierId,
        String displayName,
        String companyName,
        String vehicleTypeCode,
        String plate,
        CarrierStatus status) {

    /** Ekranda gösterilecek ad: kurumsal başvuruda unvan öne çıkar. */
    public String publicName() {
        return companyName != null && !companyName.isBlank() ? companyName : displayName;
    }
}
