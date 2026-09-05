import { auth } from '@/auth';

/**
 * Korumalı alanlar oturum ister; rol kontrolü sayfalarda yapılır (müşteri paneli
 * CUSTOMER, nakliyeci paneli DRIVER). Girişten sonra kullanıcı geldiği sayfaya döner.
 */
export default auth((req) => {
  if (req.auth && req.auth.error !== 'RefreshFailed') return;
  const login = new URL('/giris', req.nextUrl.origin);
  login.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
  return Response.redirect(login);
});

export const config = {
  matcher: ['/panel/:path*', '/nakliyeci/:path*'],
};
