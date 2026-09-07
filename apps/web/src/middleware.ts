import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Korumalı alanlar oturum ister; rol kontrolü sayfalarda yapılır (müşteri paneli
 * CUSTOMER, nakliyeci paneli DRIVER, operasyon paneli OPS_AGENT/ADMIN). Girişten
 * sonra kullanıcı geldiği sayfaya döner.
 *
 * <p>Sayfalar da kendi kontrolünü yapıyor; ikisi birden gerekli. Middleware yalnızca
 * oturumu görüyor, rolü sayfa biliyor — ve middleware atlanırsa sayfa yine korur.
 *
 * <p>İstek yolu {@code x-pathname} başlığıyla düzene iletiliyor: Next düzenlere yolu
 * vermiyor, operasyon panelinin kenar çubuğu ise hangi sayfada olduğunu bilmek zorunda.
 */
export default auth((req) => {
  if (req.auth && req.auth.error !== 'RefreshFailed') {
    const headers = new Headers(req.headers);
    headers.set('x-pathname', req.nextUrl.pathname);
    return NextResponse.next({ request: { headers } });
  }
  const login = new URL('/giris', req.nextUrl.origin);
  login.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
  return Response.redirect(login);
});

export const config = {
  matcher: ['/panel/:path*', '/nakliyeci/:path*', '/yonetim/:path*'],
};
