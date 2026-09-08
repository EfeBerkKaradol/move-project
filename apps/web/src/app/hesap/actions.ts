'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api-server';

export type PhoneState = {
  error?: string;
  /** Kod gönderildiyse hangi numaraya gittiği — kullanıcı yanlış yazdıysa görsün. */
  sentTo?: string;
  verified?: boolean;
};

/**
 * Numaraya doğrulama kodu gönderir.
 *
 * <p>Numara sunucuda yeniden normalleştiriliyor; buradaki biçimlendirme yalnızca
 * okunurluk için. İstemcinin gönderdiği biçime güvenilmiyor.
 */
export async function sendPhoneCode(_prev: PhoneState, form: FormData): Promise<PhoneState> {
  const phone = String(form.get('phone') ?? '').trim();
  if (!phone) return { error: 'Telefon numaranı gir.' };

  try {
    const res = await apiFetch<{ phone: string; message: string }>('/me/phone', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return { sentTo: res.phone };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Kod gönderilemedi.' };
  }
}

export async function verifyPhoneCode(_prev: PhoneState, form: FormData): Promise<PhoneState> {
  const code = String(form.get('code') ?? '').trim();
  const sentTo = String(form.get('sentTo') ?? '').trim() || undefined;
  if (!code) return { sentTo, error: 'Gelen kodu gir.' };

  try {
    await apiFetch('/me/phone/verify', { method: 'POST', body: JSON.stringify({ code }) });
    revalidatePath('/hesap');
    return { verified: true };
  } catch (e) {
    // sentTo korunuyor: hata sonrası form ilk adıma dönmemeli, kullanıcı
    // kodu yeniden istemek zorunda kalmasın.
    return { sentTo, error: e instanceof ApiError ? e.message : 'Doğrulama başarısız.' };
  }
}
