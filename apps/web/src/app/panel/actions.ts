'use server';

import type { CreateListingRequest, ListingPhotoView, ListingView } from '@tasiyoruz/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api-server';

export type ActionState = { error?: string; ok?: boolean };

export async function publishListing(_prev: ActionState, form: FormData): Promise<ActionState> {
  const body: CreateListingRequest = {
    serviceModel: form.get('serviceModel') === 'SCHEDULED' ? 'SCHEDULED' : 'INSTANT',
    vehicleTypeCode: String(form.get('vehicleTypeCode')),
    pickup: {
      districtId: String(form.get('pickupDistrictId')),
      floor: Number(form.get('pickupFloor') ?? 0),
      hasElevator: form.get('pickupHasElevator') === 'on',
    },
    dropoff: {
      districtId: String(form.get('dropoffDistrictId')),
      floor: Number(form.get('dropoffFloor') ?? 0),
      hasElevator: form.get('dropoffHasElevator') === 'on',
    },
    extraServices: String(form.get('extraServices') ?? '').split(',').filter(Boolean),
    cargoItems: parseItems(String(form.get('cargoItems') ?? '')),
    photoIds: String(form.get('photoIds') ?? '').split(',').filter(Boolean),
    cargoDescription: String(form.get('cargoDescription') ?? '').trim() || null,
  };
  // Sunucu da reddediyor; buradaki kontrol kullanıcıya API hata metni yerine
  // ne yapması gerektiğini söyleyen bir cümle döndürmek için
  if (body.cargoItems.length === 0) return { error: 'Yükünü kalem kalem seçmelisin.' };
  if (body.photoIds.length === 0) return { error: 'Yükünün en az bir fotoğrafını yüklemelisin.' };
  let created: ListingView;
  try {
    created = await apiFetch<ListingView>('/listings', { method: 'POST', body: JSON.stringify(body) });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'İlan yayınlanamadı.' };
  }
  revalidatePath('/panel');
  redirect(`/panel/ilan/${created.id}`);
}

/**
 * "KOD:ADET,KOD:ADET" biçimini çözer.
 *
 * <p>Gizli alanda JSON taşımak yerine bu: form verisi kullanıcı tarafından
 * değiştirilebilir ve bozuk JSON'un çözümlenmesi eylemi patlatırdı. Bozuk satır
 * burada sessizce düşüyor, sunucu zaten boş beyanı reddediyor.
 */
function parseItems(raw: string): CreateListingRequest['cargoItems'] {
  return raw
    .split(',')
    .map((pair) => pair.split(':'))
    .filter(([code, quantity]) => code && Number(quantity) > 0)
    .map(([code, quantity]) => ({ cargoItemCode: code, quantity: Math.min(Number(quantity), 99) }));
}

/**
 * Yük fotoğrafını yükler ve kimliğini döndürür.
 *
 * <p>İlan yayınlanmadan önce çalışıyor: kullanıcı kareleri seçerken görsün, yanlışını
 * silsin istiyoruz. Dosya tarayıcıdan buraya, buradan API'ye gidiyor — erişim tokeni
 * tarayıcıya inmediği için doğrudan yükleme mümkün değil.
 */
export async function uploadListingPhoto(form: FormData): Promise<{ id?: string; error?: string }> {
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Dosya seçilmedi.' };

  const upload = new FormData();
  upload.append('file', file);
  try {
    const photo = await apiFetch<ListingPhotoView>('/listing-photos', { method: 'POST', body: upload });
    return { id: photo.id };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Fotoğraf yüklenemedi.' };
  }
}

export async function removeListingPhoto(id: string): Promise<ActionState> {
  try {
    await apiFetch(`/listing-photos/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Fotoğraf silinemedi.' };
  }
}

export async function acceptOffer(listingId: string, offerId: string): Promise<ActionState> {
  try {
    await apiFetch(`/listings/${listingId}/offers/${offerId}/accept`, { method: 'POST' });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Teklif kabul edilemedi.' };
  }
  revalidatePath(`/panel/ilan/${listingId}`);
  revalidatePath('/panel');
  return {};
}

export async function cancelListing(listingId: string): Promise<ActionState> {
  try {
    await apiFetch(`/listings/${listingId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Müşteri iptal etti' }) });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'İlan iptal edilemedi.' };
  }
  revalidatePath(`/panel/ilan/${listingId}`);
  revalidatePath('/panel');
  return {};
}

export async function confirmDelivery(tripId: string, listingId: string): Promise<ActionState> {
  try {
    await apiFetch(`/trips/${tripId}/confirm-delivery`, { method: 'POST' });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Teslimat onaylanamadı.' };
  }
  revalidatePath(`/panel/ilan/${listingId}`);
  revalidatePath('/panel');
  return {};
}

/** Tamamlanan işi puanla (iş başına bir kez). */
export async function rateCarrier(_prev: ActionState, form: FormData): Promise<ActionState> {
  const tripId = String(form.get('tripId'));
  const listingId = String(form.get('listingId'));
  const score = Number(form.get('score'));
  if (!(score >= 1 && score <= 5)) return { error: 'Puan seç.' };
  try {
    await apiFetch(`/trips/${tripId}/rating`, {
      method: 'POST',
      body: JSON.stringify({ score, comment: String(form.get('comment') ?? '').trim() || null }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Puan kaydedilemedi.' };
  }
  revalidatePath(`/panel/ilan/${listingId}`);
  return { ok: true };
}
