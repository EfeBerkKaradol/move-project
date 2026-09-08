package com.tasiyoruz.api.compliance.api;

/**
 * Hesap kısıtlamalarının uygulanması.
 *
 * <p>Kısıtlı bir hesap giriş yapabiliyor — kendi kayıtlarına, sözleşmelerine ve
 * KVKK başvuru haklarına erişebilmesi gerekiyor — ama yeni işlem başlatamıyor.
 * Kapıyı tamamen kapatmak, kullanıcıyı itiraz edemez hâle getirirdi.
 */
public interface ComplianceGuard {

    AccountStatus statusOf(String userId);

    /**
     * Kullanıcı yeni işlem başlatamıyorsa 403 ile durdurur.
     *
     * <p>Kontrol servis katmanında: yalnızca arayüzde gizlenen bir kısıtlama,
     * doğrudan API çağrısıyla aşılabilirdi.
     */
    void requireCanTransact(String userId);
}
