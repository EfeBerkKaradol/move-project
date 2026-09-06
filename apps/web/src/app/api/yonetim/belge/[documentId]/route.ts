import { auth, canCallApi, isOps } from '@/auth';
import { API_URL } from '@/lib/api';

/**
 * Taşıyıcı belgesini operasyon ekranına taşıyan vekil uç.
 *
 * <p>Erişim tokeni tarayıcıya inmiyor, bu yüzden `<img src>` ve PDF gömme doğrudan
 * API'yi çağıramaz. Yetki kontrolü yine API'de; buradaki rol kontrolü, yetkisiz bir
 * isteğin API'ye hiç gitmemesi için.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const [session, { documentId }] = await Promise.all([auth(), params]);
  if (!canCallApi(session)) return new Response('Oturum gerekli.', { status: 401 });
  if (!isOps(session.roles)) return new Response('Yetkiniz yok.', { status: 403 });

  const upstream = await fetch(`${API_URL}/api/v1/admin/carriers/documents/${documentId}/file`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (!upstream.ok || !upstream.body) {
    return new Response('Belge bulunamadı.', { status: upstream.status === 403 ? 403 : 404 });
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  // Yükleme doğrulaması yalnızca görsel ve PDF kabul ediyor; vekil uç da aynı kümeyi
  // süzüyor ki kural ileride gevşerse burası açık kalmasın.
  if (!contentType.startsWith('image/') && contentType !== 'application/pdf') {
    return new Response('Desteklenmeyen içerik.', { status: 415 });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=120',
    },
  });
}
