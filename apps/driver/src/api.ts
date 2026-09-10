import { config } from './config';

export class ApiError extends Error {
  constructor(public durum: number, mesaj: string) {
    super(mesaj);
  }
}

/**
 * Oturumlu API çağrısı.
 *
 * <p>Token'ı çağıran taraf değil, {@code erisimTokeni} sağlıyor: süresi dolmuşsa
 * orada yenileniyor. Her çağrı yerinde "token geçerli mi" kontrolü yapsaydı
 * mantık dağılır ve biri unutulduğunda sessizce 401 alınırdı.
 *
 * <p>Zaman aşımı zorunlu: sürücü tünelde ya da kapsama dışında olabiliyor ve
 * zaman aşımı olmayan bir istek ekranı süresiz kilitler.
 */
export async function apiFetch<T>(
  yol: string,
  erisimTokeni: () => Promise<string | null>,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const token = await erisimTokeni();
  if (!token) throw new ApiError(401, 'Oturum gerekli.');

  const { timeoutMs, ...kalan } = init;
  const yanit = await fetch(`${config.apiUrl}/api/v1${yol}`, {
    ...kalan,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(kalan.body ? { 'Content-Type': 'application/json' } : {}),
      ...(kalan.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs ?? 15_000),
  });

  if (!yanit.ok) {
    const sorun = (await yanit.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(yanit.status, sorun?.detail ?? `İstek başarısız (${yanit.status}).`);
  }
  // 204: taşıyıcı başvurusu henüz yok
  return yanit.status === 204 ? (undefined as T) : ((await yanit.json()) as T);
}
