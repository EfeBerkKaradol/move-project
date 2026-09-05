'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api-server';

export type ActionState = { error?: string; ok?: boolean };

export async function submitOffer(_prev: ActionState, form: FormData): Promise<ActionState> {
  const listingId = String(form.get('listingId'));
  const amount = String(form.get('amount') ?? '').replace(',', '.');
  try {
    await apiFetch(`/driver/listings/${listingId}/offers`, {
      method: 'POST',
      body: JSON.stringify({ amount, note: String(form.get('note') ?? '').trim() || null }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Teklif gönderilemedi.' };
  }
  revalidatePath('/nakliyeci'); revalidatePath('/nakliyeci/teklifler');
  return { ok: true };
}

export async function withdrawOffer(offerId: string): Promise<ActionState> {
  try {
    await apiFetch(`/driver/offers/${offerId}/withdraw`, { method: 'POST' });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Teklif geri çekilemedi.' };
  }
  revalidatePath('/nakliyeci/teklifler'); revalidatePath('/nakliyeci');
  return { ok: true };
}
