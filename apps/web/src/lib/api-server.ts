import 'server-only';
import { auth } from '@/auth';
import { API_URL } from './api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Oturumlu API çağrısı — yalnızca sunucu bileşenleri ve server action'lar.
 * Access token tarayıcıya hiç inmez; Bearer başlığı burada eklenir.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const session = await auth();
  if (!session?.accessToken || session.error === 'RefreshFailed') {
    throw new ApiError(401, 'Oturum gerekli.');
  }
  const { timeoutMs, ...rest } = init;
  // FormData'da Content-Type'ı fetch kendisi kuruyor; elle yazmak multipart sınır
  // (boundary) parametresini düşürür ve sunucu gövdeyi ayrıştıramaz.
  const isMultipart = rest.body instanceof FormData;
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(rest.body && !isMultipart ? { 'Content-Type': 'application/json' } : {}),
      ...(rest.headers ?? {}),
    },
    cache: 'no-store',
    // Belge yükleme birkaç MB olabiliyor; varsayılan 10 sn onun için yetmiyor
    signal: AbortSignal.timeout(timeoutMs ?? (isMultipart ? 60_000 : 10_000)),
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as { detail?: string; message?: string } | null;
    throw new ApiError(res.status, problem?.detail ?? problem?.message ?? `İstek başarısız (${res.status}).`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
