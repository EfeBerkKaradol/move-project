'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api-server';

export type ActionState = { error?: string; ok?: boolean };

/**
 * Yerel saatle girilen tarih-saat alanını ISO'ya çevirir. Boş bırakılırsa null.
 * `datetime-local` değeri saat dilimi taşımaz; sunucuya ham gönderilseydi UTC
 * varsayılır ve taşıyıcının penceresi üç saat kayardı.
 */
function toInstant(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function createCorridor(_prev: ActionState, form: FormData): Promise<ActionState> {
  const departureFrom = toInstant(form.get('departureFrom'));
  const departureTo = toInstant(form.get('departureTo'));
  if (!departureFrom || !departureTo) return { error: 'Kalkış penceresini eksiksiz girin.' };

  const minAmountRaw = String(form.get('minAmount') ?? '').replace(',', '.').trim();

  try {
    await apiFetch('/driver/corridors', {
      method: 'POST',
      body: JSON.stringify({
        vehicleTypeCode: String(form.get('vehicleTypeCode')),
        originDistrictId: String(form.get('originDistrictId')),
        destinationDistrictId: String(form.get('destinationDistrictId')),
        departureFrom,
        departureTo,
        detourToleranceKm: Number(form.get('detourToleranceKm')),
        minAmount: minAmountRaw || null,
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Koridor kaydedilemedi.' };
  }
  revalidatePath('/nakliyeci/koridor');
  revalidatePath('/nakliyeci');
  return { ok: true };
}

export async function setCorridorPaused(corridorId: string, paused: boolean): Promise<ActionState> {
  try {
    await apiFetch(`/driver/corridors/${corridorId}/${paused ? 'pause' : 'resume'}`, { method: 'POST' });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Koridor güncellenemedi.' };
  }
  revalidatePath('/nakliyeci/koridor');
  return { ok: true };
}

export async function deleteCorridor(corridorId: string): Promise<ActionState> {
  try {
    await apiFetch(`/driver/corridors/${corridorId}`, { method: 'DELETE' });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Koridor silinemedi.' };
  }
  revalidatePath('/nakliyeci/koridor');
  revalidatePath('/nakliyeci');
  return { ok: true };
}

export async function ignoreMatch(matchId: string): Promise<ActionState> {
  try {
    await apiFetch(`/driver/corridors/matches/${matchId}/ignore`, { method: 'POST' });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Eşleşme kapatılamadı.' };
  }
  revalidatePath('/nakliyeci/koridor');
  revalidatePath('/nakliyeci');
  return { ok: true };
}
