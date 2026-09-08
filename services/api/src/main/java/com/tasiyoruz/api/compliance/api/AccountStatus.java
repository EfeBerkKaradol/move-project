package com.tasiyoruz.api.compliance.api;

/**
 * Hesabın platform üzerindeki durumu.
 *
 * <p>Kimlik doğrulama Keycloak'ta; buradaki durum platformun kendi kararı.
 * Kısıtlı bir kullanıcı giriş yapabilir — hesabına, kayıtlarına ve başvuru
 * haklarına erişebilmesi gerekiyor — ama yeni işlem başlatamaz.
 */
public enum AccountStatus {
    ACTIVE,
    /** Yeni işlem açamaz; mevcut işlerini sürdürebilir. */
    RESTRICTED,
    /** İnceleme süresince tüm işlem yetkisi durdurulmuş. */
    SUSPENDED,
    /** Kalıcı olarak kapatılmış. */
    BANNED;

    /** Yeni bir ilan ya da teklif başlatabilir mi? */
    public boolean canTransact() {
        return this == ACTIVE;
    }
}
