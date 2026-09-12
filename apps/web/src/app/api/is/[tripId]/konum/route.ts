import { auth, canCallApi, isDriver } from '@/auth';
import { API_URL } from '@/lib/api';

/**
 * Sürücünün konum bildirimini API'ye taşıyan vekil uç.
 *
 * <p>Token tarayıcıya hiç inmiyor; istek burada sunucuda imzalanıyor. Sunucu
 * eylemi (server action) yerine rota kullanılıyor: bildirim dakikada birkaç kez
 * geliyor ve her sunucu eylemi sayfayı yeniden doğrulatıp bütün ekranı boşuna
 * yeniden çizerdi.
 *
 * <p>Yetki API'de: işin taşıyıcısı değilse 403 dönüyor. Buradaki rol kontrolü
 * yalnızca erken çıkış — sürücü olmayan birinin konumunu hiç iletmiyoruz.
 */
export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const [session, { tripId }] = await Promise.all([auth(), params]);
  if (!canCallApi(session)) return new Response('Oturum gerekli.', { status: 401 });
  if (!isDriver(session.roles)) return new Response('Yalnızca araç sahibi konum bildirir.', { status: 403 });

  const body = (await request.json().catch(() => null)) as
    | { lat?: unknown; lng?: unknown; accuracyM?: unknown }
    | null;
  // Koordinat doğrulaması API'de de var; burada erken eleme, geçersiz veriyle
  // ağa çıkmamak için
  if (typeof body?.lat !== 'number' || typeof body?.lng !== 'number') {
    return new Response('Geçersiz konum.', { status: 400 });
  }

  const upstream = await fetch(`${API_URL}/api/v1/driver/trips/${tripId}/location`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lat: body.lat,
      lng: body.lng,
      accuracyM: typeof body.accuracyM === 'number' ? body.accuracyM : null,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  // Gövde geri taşınmıyor: sürücü uygulamasının işine yaramıyor ve iş görünümünün
  // tamamını her bildirimde ağdan geçirmek gereksiz
  return new Response(null, { status: upstream.ok ? 204 : upstream.status });
}
