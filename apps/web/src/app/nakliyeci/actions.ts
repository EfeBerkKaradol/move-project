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

export async function advanceTrip(tripId: string, expected: string): Promise<ActionState> {
  try {
    await apiFetch(`/driver/trips/${tripId}/advance`, { method: 'POST', body: JSON.stringify({ stage: expected }) });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Aşama ilerletilemedi.' };
  }
  revalidatePath(`/nakliyeci/is/${tripId}`); revalidatePath('/nakliyeci/isler');
  return { ok: true };
}

export async function deliverTrip(_prev: ActionState, form: FormData): Promise<ActionState> {
  const tripId = String(form.get('tripId'));
  try {
    await apiFetch(`/driver/trips/${tripId}/proof-of-delivery`, {
      method: 'POST',
      body: JSON.stringify({ receivedByName: String(form.get('receivedByName') ?? '').trim(), note: String(form.get('note') ?? '').trim() || null }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Teslim bildirilemedi.' };
  }
  revalidatePath(`/nakliyeci/is/${tripId}`); revalidatePath('/nakliyeci/isler');
  return { ok: true };
}
