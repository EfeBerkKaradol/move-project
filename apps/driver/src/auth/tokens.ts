import * as SecureStore from 'expo-secure-store';

/**
 * Oturum saklama.
 *
 * <p>Yalnızca <strong>yenileme token'ı</strong> cihazda kalıcı olarak saklanıyor;
 * erişim token'ı bellekte tutuluyor. Gerekçe: erişim token'ı dakikalar içinde
 * geçersizleşiyor ve diske yazmanın tek faydası bir uygulama açılışı kadar zaman
 * kazanmak olurdu — buna karşılık cihazı ele geçiren biri için hazır bir anahtar
 * bırakırdı. Yenileme token'ı ise saklanmak zorunda, yoksa sürücü her açılışta
 * yeniden giriş yapardı.
 *
 * <p>SecureStore iOS'ta Keychain, Android'de EncryptedSharedPreferences kullanıyor;
 * AsyncStorage düz metin yazıyor ve token için uygun değil.
 */
const ANAHTAR = 'karinca.driver.refreshToken';

/**
 * Cihaz kilidi açıkken erişilebilir, yedeklere GİRMEZ.
 *
 * <p>Yedeğe girseydi token başka bir cihaza geri yüklenebilirdi. `AFTER_FIRST_UNLOCK`
 * yerine `WHEN_UNLOCKED` seçilmedi: sürücü uygulaması arka planda konum gönderirken
 * telefon kilitli olabiliyor ve token'a erişmesi gerekiyor.
 */
const secenekler: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export async function yenilemeTokeniOku(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ANAHTAR, secenekler);
  } catch {
    // Anahtarlık okunamıyorsa oturum yok sayılır; kullanıcı yeniden giriş yapar.
    return null;
  }
}

export async function yenilemeTokeniYaz(token: string): Promise<void> {
  await SecureStore.setItemAsync(ANAHTAR, token, secenekler);
}

export async function yenilemeTokeniSil(): Promise<void> {
  await SecureStore.deleteItemAsync(ANAHTAR, secenekler);
}
