import { auth, canCallApi, isDriver } from '@/auth';
import { API_URL } from '@/lib/api';

/**
 * Yük fotoğrafını tarayıcıya taşıyan vekil uç.
 *
 * <p>API dosyayı Bearer token ile veriyor ve token tarayıcıya hiç inmiyor; bu yüzden
 * `<img src>` doğrudan API'yi çağıramaz. İstek burada sunucuda imzalanıyor.
 *
 * <p>Kimin görebileceğine API karar veriyor: ilan sahibi her zaman, araç sahibi ise
 * ilanı teklif için görebildiği sürece. Buradaki rol ayrımı yalnızca doğru ucu
 * seçmek için.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listingId: string; photoId: string }> },
) {
  const [session, { listingId, photoId }] = await Promise.all([auth(), params]);
  if (!canCallApi(session)) return new Response('Oturum gerekli.', { status: 401 });

  const base = isDriver(session.roles) ? '/driver/listings' : '/listings';
  const upstream = await fetch(`${API_URL}/api/v1${base}/${listingId}/photos/${photoId}/file`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('Fotoğraf bulunamadı.', { status: upstream.status === 403 ? 403 : 404 });
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  // Yükleme doğrulaması görsel dışını zaten reddediyor; vekil ucun bunu tekrar
  // süzmesi, ileride kural gevşerse burayı açık bırakmıyor.
  if (!contentType.startsWith('image/')) {
    return new Response('Desteklenmeyen içerik.', { status: 415 });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
