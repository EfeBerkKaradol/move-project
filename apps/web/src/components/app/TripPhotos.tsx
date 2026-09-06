import type { TripPhotoView } from '@tasiyoruz/contracts';

/**
 * Taşıma kareleri.
 *
 * <p>Kaynak API değil, web uygulamasının vekil ucu: erişim tokeni tarayıcıya inmiyor.
 * `next/image` kullanılmıyor — görseller kimlik doğrulaması arkasında ve boyutları
 * bilinmiyor, optimizasyon katmanı ikisini de çözemiyor.
 */
export function TripPhotos({ tripId, photos }: { tripId: string; photos: TripPhotoView[] }) {
  if (photos.length === 0) return null;

  return (
    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo) => (
        <li key={photo.id} className="overflow-hidden rounded-field border border-line bg-surface-2">
          <a href={`/api/is/${tripId}/foto/${photo.id}`} target="_blank" rel="noreferrer"
            className="block transition hover:opacity-90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/is/${tripId}/foto/${photo.id}`} alt={`${photo.kindDisplayName} fotoğrafı`}
              loading="lazy" className="aspect-4/3 w-full object-cover" />
          </a>
          <p className="label-mono px-2 py-1.5 text-muted">
            {photo.kindDisplayName} · {new Date(photo.uploadedAt).toLocaleDateString('tr-TR')}
          </p>
        </li>
      ))}
    </ul>
  );
}
