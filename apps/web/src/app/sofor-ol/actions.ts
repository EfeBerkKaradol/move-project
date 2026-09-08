'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api-server';

export type ActionState = { error?: string; ok?: boolean };

function fail(e: unknown, fallback: string): ActionState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

export async function saveApplication(_prev: ActionState, form: FormData): Promise<ActionState> {
  const text = (name: string) => String(form.get(name) ?? '').trim() || null;
  try {
    await apiFetch('/carrier/profile', {
      method: 'PUT',
      body: JSON.stringify({
        displayName: text('displayName'),
        phone: text('phone')?.replace(/\s/g, '') ?? null,
        companyName: text('companyName'),
        taxId: text('taxId'),
        vehicleTypeCode: text('vehicleTypeCode'),
        // Alan ekranda büyük harf gösteriliyor; değeri de öyle gönderelim ki
        // kullanıcının gördüğüyle kaydedilen aynı olsun
        plate: text('plate')?.toLocaleUpperCase('tr') ?? null,
        complianceDeclared: form.get('complianceDeclared') === 'on',
      }),
    });
  } catch (e) {
    return fail(e, 'Başvuru kaydedilemedi.');
  }
  revalidatePath('/sofor-ol');
  return { ok: true };
}

export async function uploadDocument(_prev: ActionState, form: FormData): Promise<ActionState> {
  const kind = String(form.get('kind'));
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Dosya seçilmedi.' };

  const expiresOn = String(form.get('expiresOn') ?? '').trim();
  const body = new FormData();
  body.append('file', file);

  try {
    await apiFetch(`/carrier/profile/documents/${kind}${expiresOn ? `?expiresOn=${expiresOn}` : ''}`, {
      method: 'POST',
      body,
    });
  } catch (e) {
    return fail(e, 'Belge yüklenemedi.');
  }
  revalidatePath('/sofor-ol');
  return { ok: true };
}

export async function deleteDocument(documentId: string): Promise<ActionState> {
  try {
    await apiFetch(`/carrier/profile/documents/${documentId}`, { method: 'DELETE' });
  } catch (e) {
    return fail(e, 'Belge silinemedi.');
  }
  revalidatePath('/sofor-ol');
  return { ok: true };
}

export async function submitApplication(): Promise<ActionState> {
  try {
    await apiFetch('/carrier/profile/submit', { method: 'POST' });
  } catch (e) {
    return fail(e, 'Başvuru gönderilemedi.');
  }
  revalidatePath('/sofor-ol');
  return { ok: true };
}
