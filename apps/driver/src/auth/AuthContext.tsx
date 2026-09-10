import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '../config';
import { yenilemeTokeniOku, yenilemeTokeniSil, yenilemeTokeniYaz } from './tokens';

// Giriş tamamlanınca tarayıcı sekmesini kapatır; olmadan kullanıcı boş bir
// tarayıcı penceresiyle baş başa kalıyor.
WebBrowser.maybeCompleteAuthSession();

/** Erişim token'ı bu kadar kalmışken yenileniyor. */
const YENILEME_PAYI_SN = 60;

type Oturum = {
  accessToken: string;
  expiresAt: number;
  /** Token'ın kimlik bilgileri; profil ekranı ve hata ayıklama için. */
  kullanici: { ad: string | null; eposta: string | null };
};

type AuthDurumu =
  | { durum: 'yukleniyor' }
  | { durum: 'cikis' }
  | { durum: 'giris'; kullanici: Oturum['kullanici'] };

type AuthApi = AuthDurumu & {
  girisYap: () => Promise<void>;
  kayitOl: () => Promise<void>;
  cikisYap: () => Promise<void>;
  /** Geçerli erişim token'ı; gerekirse yenileyerek. Yoksa null. */
  erisimTokeni: () => Promise<string | null>;
  hata: string | null;
};

const Ctx = createContext<AuthApi | null>(null);

/** JWT gövdesini çözer. İmza DOĞRULANMAZ — sunucu zaten doğruluyor, bu sadece görüntüleme. */
function tokenGovdesi(jwt: string): Record<string, unknown> {
  try {
    const govde = jwt.split('.')[1];
    const json = atob(govde.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const discovery = AuthSession.useAutoDiscovery(config.issuer);
  const [durum, setDurum] = useState<AuthDurumu>({ durum: 'yukleniyor' });
  const [hata, setHata] = useState<string | null>(null);

  // Oturum bir ref'te: erisimTokeni() render döngüsünün dışından çağrılıyor
  // (API isteği sırasında) ve o anki en güncel değeri görmesi gerekiyor.
  const oturum = useRef<Oturum | null>(null);
  const yenilemeSurmekte = useRef<Promise<string | null> | null>(null);

  const redirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ scheme: config.scheme, path: 'auth' }),
    [],
  );

  const oturumKur = useCallback(async (yanit: AuthSession.TokenResponse) => {
    const kimlik = yanit.idToken ? tokenGovdesi(yanit.idToken) : {};
    oturum.current = {
      accessToken: yanit.accessToken,
      expiresAt: Date.now() + (yanit.expiresIn ?? 300) * 1000,
      kullanici: {
        ad: (kimlik.name as string) ?? null,
        eposta: (kimlik.email as string) ?? null,
      },
    };
    if (yanit.refreshToken) await yenilemeTokeniYaz(yanit.refreshToken);
    setDurum({ durum: 'giris', kullanici: oturum.current.kullanici });
    setHata(null);
  }, []);

  const oturumKapat = useCallback(async () => {
    oturum.current = null;
    await yenilemeTokeniSil();
    setDurum({ durum: 'cikis' });
  }, []);

  /**
   * Yenileme token'ı ile yeni erişim token'ı alır.
   *
   * <p>Eşzamanlı çağrılar tek bir isteği paylaşıyor: sürücü ekranında birkaç istek
   * aynı anda token isteyebiliyor ve her biri ayrı yenileme yapsaydı Keycloak
   * token'ı döndürdüğü için ilk yenilemenin sonucu geçersizleşir, kullanıcı
   * sebepsiz yere çıkarılırdı.
   */
  const yenile = useCallback(async (): Promise<string | null> => {
    if (yenilemeSurmekte.current) return yenilemeSurmekte.current;
    const islem = (async () => {
      const token = await yenilemeTokeniOku();
      if (!token || !discovery) return null;
      try {
        const yanit = await AuthSession.refreshAsync(
          { clientId: config.clientId, refreshToken: token },
          discovery,
        );
        await oturumKur(yanit);
        return yanit.accessToken;
      } catch {
        // Yenileme token'ı da ölmüş: oturum gerçekten bitti.
        await oturumKapat();
        return null;
      } finally {
        yenilemeSurmekte.current = null;
      }
    })();
    yenilemeSurmekte.current = islem;
    return islem;
  }, [discovery, oturumKur, oturumKapat]);

  // Açılışta saklı yenileme token'ı varsa sessizce oturum açılıyor.
  useEffect(() => {
    if (!discovery) return;
    let iptal = false;
    (async () => {
      const token = await yenilemeTokeniOku();
      if (!token) {
        if (!iptal) setDurum({ durum: 'cikis' });
        return;
      }
      const yeni = await yenile();
      if (!iptal && !yeni) setDurum({ durum: 'cikis' });
    })();
    return () => {
      iptal = true;
    };
  }, [discovery, yenile]);

  const erisimTokeni = useCallback(async () => {
    const mevcut = oturum.current;
    if (mevcut && Date.now() < mevcut.expiresAt - YENILEME_PAYI_SN * 1000) {
      return mevcut.accessToken;
    }
    return yenile();
  }, [yenile]);

  /**
   * Tarayıcıda yetkilendirme akışını başlatır.
   *
   * @param kayit true ise Keycloak'ın kayıt ekranı açılıyor; giriş ekranından
   *        "hesap oluştur"a tıklatmak yerine doğrudan oraya götürmek daha kısa.
   */
  const akisiBaslat = useCallback(
    async (kayit: boolean) => {
      if (!discovery) {
        setHata('Kimlik sunucusuna ulaşılamadı. Bağlantını kontrol et.');
        return;
      }
      setHata(null);
      const istek = new AuthSession.AuthRequest({
        clientId: config.clientId,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        usePKCE: true,
      });
      const uc = kayit
        ? `${config.issuer}/protocol/openid-connect/registrations`
        : discovery.authorizationEndpoint;

      const yanit = await istek.promptAsync(
        { ...discovery, authorizationEndpoint: uc },
        { showInRecents: false },
      );
      if (yanit.type !== 'success') {
        if (yanit.type === 'error') setHata('Giriş tamamlanamadı. Tekrar dene.');
        return;
      }
      try {
        const token = await AuthSession.exchangeCodeAsync(
          {
            clientId: config.clientId,
            redirectUri,
            code: yanit.params.code,
            // PKCE doğrulayıcısı olmadan Keycloak invalid_grant döner.
            extraParams: { code_verifier: istek.codeVerifier ?? '' },
          },
          discovery,
        );
        await oturumKur(token);
      } catch {
        setHata('Giriş tamamlanamadı. Tekrar dene.');
      }
    },
    [discovery, redirectUri, oturumKur],
  );

  const cikisYap = useCallback(async () => {
    const token = await yenilemeTokeniOku();
    await oturumKapat();
    // Keycloak oturumu da kapatılıyor; yalnızca yerel token silinseydi tarayıcıdaki
    // oturum açık kalır ve "giriş yap" tek tıkla aynı hesaba geri girerdi.
    if (token && discovery?.endSessionEndpoint) {
      const url =
        `${discovery.endSessionEndpoint}?client_id=${encodeURIComponent(config.clientId)}` +
        `&post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`;
      await WebBrowser.openAuthSessionAsync(url, redirectUri, { showInRecents: false }).catch(
        () => undefined,
      );
    }
  }, [discovery, oturumKapat, redirectUri]);

  const deger = useMemo<AuthApi>(
    () => ({
      ...durum,
      hata,
      girisYap: () => akisiBaslat(false),
      kayitOl: () => akisiBaslat(true),
      cikisYap,
      erisimTokeni,
    }),
    [durum, hata, akisiBaslat, cikisYap, erisimTokeni],
  );

  return <Ctx.Provider value={deger}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return v;
}
