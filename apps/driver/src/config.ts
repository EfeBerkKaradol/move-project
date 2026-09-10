/**
 * Ortam ayarları.
 *
 * <p>Expo'da yalnızca {@code EXPO_PUBLIC_} ön ekli değişkenler pakete giriyor.
 * Buradakilerin hepsi zaten herkese açık bilgi: kimlik sunucusunun adresi, istemci
 * kimliği ve API adresi. Gizli anahtar YOK ve olmamalı — mobil uygulama public
 * client; pakete gömülen bir sır, uygulamayı indiren herkesin eline geçer. Bu yüzden
 * akış PKCE ile korunuyor.
 */
const zorunlu = (deger: string | undefined, varsayilan: string) =>
  deger && deger.trim() ? deger.trim().replace(/\/+$/, '') : varsayilan;

export const config = {
  /** Keycloak realm kökü; discovery belgesi buradan okunuyor. */
  issuer: zorunlu(
    process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER,
    'http://localhost:8081/realms/tasiyoruz',
  ),
  clientId: zorunlu(process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID, 'tasiyoruz-driver-app'),
  apiUrl: zorunlu(process.env.EXPO_PUBLIC_API_URL, 'http://localhost:8080'),
  /** app.json'daki şema ile aynı olmalı; realm'in yönlendirme adresi buna bağlı. */
  scheme: 'tasiyoruz-driver',
} as const;
