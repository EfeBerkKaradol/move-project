'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api-server';

export type ActionState = { error?: string; ok?: boolean };

function fail(e: unknown, fallback: string): ActionState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

/** Belgeyi onayla ya da gerekçeyle reddet (docs/01 FR-2.3). */
export async function reviewDocument(_prev: ActionState, form: FormData): Promise<ActionState> {
  const approved = String(form.get('approved')) === 'true';
  const reason = String(form.get('reason') ?? '').trim();
  if (!approved && !reason) return { error: 'Red gerekçesi zorunlu.' };
  try {
    await apiFetch(`/admin/carriers/documents/${String(form.get('documentId'))}/review`, {
      method: 'POST',
      body: JSON.stringify({ approved, reason: reason || null }),
    });
  } catch (e) {
    return fail(e, 'Belge kararı kaydedilemedi.');
  }
  revalidatePath('/yonetim/basvurular');
  return { ok: true };
}

export async function reviewProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  const approved = String(form.get('approved')) === 'true';
  const reason = String(form.get('reason') ?? '').trim();
  if (!approved && !reason) return { error: 'Red gerekçesi zorunlu.' };
  try {
    await apiFetch(`/admin/carriers/${String(form.get('carrierId'))}/review`, {
      method: 'POST',
      body: JSON.stringify({ approved, reason: reason || null }),
    });
  } catch (e) {
    return fail(e, 'Başvuru sonuçlandırılamadı.');
  }
  revalidatePath('/yonetim/basvurular');
  revalidatePath('/yonetim');
  return { ok: true };
}

export async function suspendCarrier(_prev: ActionState, form: FormData): Promise<ActionState> {
  const reason = String(form.get('reason') ?? '').trim();
  if (!reason) return { error: 'Askıya alma gerekçesi zorunlu.' };
  try {
    await apiFetch(`/admin/carriers/${String(form.get('carrierId'))}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  } catch (e) {
    return fail(e, 'Taşıyıcı askıya alınamadı.');
  }
  revalidatePath('/yonetim/basvurular');
  revalidatePath('/yonetim');
  return { ok: true };
}

export async function reactivateCarrier(carrierId: string): Promise<ActionState> {
  try {
    await apiFetch(`/admin/carriers/${carrierId}/reactivate`, { method: 'POST' });
  } catch (e) {
    return fail(e, 'Askı kaldırılamadı.');
  }
  revalidatePath('/yonetim/basvurular');
  revalidatePath('/yonetim');
  return { ok: true };
}

export async function cancelListing(_prev: ActionState, form: FormData): Promise<ActionState> {
  const reason = String(form.get('reason') ?? '').trim();
  if (!reason) return { error: 'İptal gerekçesi zorunlu.' };
  try {
    await apiFetch(`/admin/listings/${String(form.get('listingId'))}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  } catch (e) {
    return fail(e, 'İlan kapatılamadı.');
  }
  revalidatePath('/yonetim/ilanlar');
  revalidatePath('/yonetim');
  return { ok: true };
}
