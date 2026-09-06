import NextAuth, { type NextAuthConfig } from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

/**
 * Kimlik: Auth.js + Keycloak.
 *
 * <p>Oturum sunucu tarafında (JWT çerezi) tutulur; Keycloak'ın access token'ı
 * çerezin içinde saklanır ve API'ye Bearer olarak taşınır. Token kısa ömürlü
 * (Keycloak varsayılanı 5 dk) olduğu için refresh token ile sessizce yenilenir.
 *
 * <p>Roller Keycloak'ın realm_access.roles claim'inden okunur — API'deki
 * KeycloakRealmRoleConverter ile aynı kaynak, iki taraf aynı yetkiyi görür.
 */

type KeycloakTokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
};

function rolesOf(accessToken: string | undefined): string[] {
  if (!accessToken) return [];
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString());
    return payload?.realm_access?.roles ?? [];
  } catch {
    return [];
  }
}

async function refresh(refreshToken: string): Promise<KeycloakTokenSet> {
  const res = await fetch(`${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.AUTH_KEYCLOAK_ID!,
      client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
      refresh_token: refreshToken,
    }),
  });
  const body = (await res.json()) as KeycloakTokenSet;
  if (!res.ok) throw new Error(body.error ?? `refresh ${res.status}`);
  return body;
}

export const authConfig: NextAuthConfig = {
  providers: [
    Keycloak({
      // Keycloak arayüz dilini tarayıcı dili belirliyor; realm varsayılanı yetmiyor
      authorization: { params: { ui_locales: 'tr' } },
    }),
    /*
     * Kayıt, aynı istemcinin farklı bir uç noktası: Keycloak'ın /registrations
     * adresi doğrudan kayıt formunu açar. Ayrı bir sağlayıcı kimliği olarak
     * tanımlanıyor ki signIn('keycloak-signup') kullanıcıyı giriş yerine kayda
     * götürsün; dönüş akışı (token, roller) girişle birebir aynı.
     */
    Keycloak({
      id: 'keycloak-signup',
      name: 'Keycloak (kayıt)',
      authorization: {
        url: `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/registrations`,
        params: { ui_locales: 'tr', scope: 'openid profile email' },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/giris' },
  callbacks: {
    async jwt({ token, account }) {
      // İlk giriş: Keycloak'tan gelen token seti saklanır
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          expiresAt: account.expires_at ?? 0,
          roles: rolesOf(account.access_token),
        };
      }
      // Süresi dolmamışsa olduğu gibi
      if (Date.now() < ((token.expiresAt as number) - 30) * 1000) return token;
      // Dolmuşsa yenile; yenilenemezse oturum hatalı işaretlenir, kullanıcı yeniden girer
      try {
        const fresh = await refresh(token.refreshToken as string);
        return {
          ...token,
          accessToken: fresh.access_token,
          refreshToken: fresh.refresh_token ?? token.refreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + fresh.expires_in,
          roles: rolesOf(fresh.access_token),
          error: undefined,
        };
      } catch {
        return { ...token, error: 'RefreshFailed' };
      }
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.idToken = token.idToken as string | undefined;
      session.roles = (token.roles as string[]) ?? [];
      session.error = token.error as string | undefined;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * Oturum API'yi çağırabilecek durumda mı?
 *
 * <p>Yenileme başarısız olduğunda çerez hâlâ duruyor ve `auth()` bir oturum döndürüyor,
 * ama içindeki access token ölü. Sayfalar yalnızca `!session` diye baksaydı — nitekim
 * öyle bakıyorlardı — bu kullanıcı giriş ekranı yerine 500 görürdü. Süresi dolmuş
 * oturum, oturumsuzla aynı muameleyi görmeli.
 */
export function canCallApi<T extends { accessToken?: string; error?: string }>(
  session: T | null | undefined,
): session is T {
  return Boolean(session?.accessToken) && session?.error !== 'RefreshFailed';
}

/** Rol tabanlı yönlendirme için yardımcılar. */
export const isCustomer = (roles: string[]) => roles.includes('CUSTOMER');
export const isDriver = (roles: string[]) => roles.includes('DRIVER');

/**
 * Kullanıcının ait olduğu panel.
 *
 * <p>Rolsüz kullanıcı için `/hesap` döner. Bu şart: paneller birbirine
 * yönlendiriyor (müşteri paneli sürücüyü `/nakliyeci`'ye, sürücü paneli
 * müşteriyi `/panel`'e), rolsüz biri ikisi arasında sonsuz döngüye girerdi.
 * Kendi kaydolan kullanıcılar CUSTOMER alır ama bu güvence yine de gerekli:
 * rol elle kaldırılabilir ya da yeni bir rol eklenebilir.
 */
export function homeFor(roles: string[]): string {
  if (isDriver(roles)) return '/nakliyeci';
  if (isCustomer(roles)) return '/panel';
  return '/hesap';
}

/**
 * Çıkış iki oturumu da kapatır: Auth.js çerezi ve Keycloak SSO oturumu.
 *
 * <p>Yalnızca çerez silinirse Keycloak tarafında oturum açık kalır; bir sonraki
 * "Giriş yap" tıklaması şifre sormadan aynı kullanıcıyla içeri alır — ortak
 * bilgisayarda gerçek bir güvenlik açığı.
 */
export async function signOutEverywhere(returnTo = '/') {
  const session = await auth();
  const origin = process.env.AUTH_URL ?? 'http://localhost:3000';
  await signOut({ redirect: false });
  const end = new URL(`${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/logout`);
  if (session?.idToken) end.searchParams.set('id_token_hint', session.idToken);
  end.searchParams.set('post_logout_redirect_uri', new URL(returnTo, origin).toString());
  end.searchParams.set('client_id', process.env.AUTH_KEYCLOAK_ID!);
  return end.toString();
}
