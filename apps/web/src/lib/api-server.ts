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
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await auth();
  if (!session?.accessToken || session.error === 'RefreshFailed') {
    throw new ApiError(401, 'Oturum gerekli.');
  }
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as { detail?: string; message?: string } | null;
    throw new ApiError(res.status, problem?.detail ?? problem?.message ?? `İstek başarısız (${res.status}).`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
