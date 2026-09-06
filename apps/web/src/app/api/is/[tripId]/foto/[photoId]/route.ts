import { auth, canCallApi, isDriver } from '@/auth';
import { API_URL } from '@/lib/api';

/**
 * Taşıma fotoğrafını tarayıcıya taşıyan vekil uç.
 *
 * <p>API dosyayı Bearer token ile veriyor ve token tarayıcıya hiç inmiyor; bu yüzden
 * `<img src>` doğrudan API'yi çağıramaz. İstek burada sunucuda imzalanıyor.
 *
 * <p>Yetki kontrolü API'de: işin tarafı olmayan 403 alıyor. Buradaki rol ayrımı yalnızca
 * doğru ucu seçmek için — yük veren ve taşıyıcı farklı yollardan okuyor.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string; photoId: string }> },
) {
  const [session, { tripId, photoId }] = await Promise.all([auth(), params]);
  if (!canCallApi(session)) return new Response('Oturum gerekli.', { status: 401 });

  const base = isDriver(session.roles) ? '/driver/trips' : '/trips';
  const upstream = await fetch(`${API_URL}/api/v1${base}/${tripId}/photos/${photoId}/file`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('Fotoğraf bulunamadı.', { status: upstream.status === 403 ? 403 : 404 });
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  // Yalnızca görsel geçiyor: yükleme doğrulaması zaten görsel dışını reddediyor, ama
  // vekil ucun bunu tekrar süzmesi, ileride kural gevşerse burayı açık bırakmıyor.
  if (!contentType.startsWith('image/')) {
    return new Response('Desteklenmeyen içerik.', { status: 415 });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': contentType,
      // Sayfada gösterilecek, indirilmeyecek
      'Content-Disposition': 'inline',
      // Tarayıcı içerik tipini tahmin etmeye çalışmasın
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
