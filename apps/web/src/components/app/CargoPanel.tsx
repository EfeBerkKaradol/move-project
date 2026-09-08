import type { ListingView } from '@tasiyoruz/contracts';

/**
 * İlanın yük beyanı: ne taşınacak, ne kadar, neye benziyor.
 *
 * <p>Aynı panel iki tarafta da duruyor — yük veren ne beyan ettiğini, araç sahibi
 * neye teklif verdiğini görüyor. İkisinin ayrı bileşen olması, birinde düzeltilen
 * bir eksiğin diğerinde kalmasına yol açardı.
 */
export function CargoPanel({ listing }: { listing: ListingView }) {
  const { cargoItems, photos } = listing;
  if (cargoItems.length === 0 && photos.length === 0 && !listing.cargoDescription) return null;

  const pieces = cargoItems.reduce((sum, i) => sum + i.quantity, 0);
  const volumeM3 = cargoItems.reduce((sum, i) => sum + i.volumeM3 * i.quantity, 0);
  const weightKg = cargoItems.reduce((sum, i) => sum + i.weightKg * i.quantity, 0);

  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="label-mono text-muted">Yük</h2>
        {pieces > 0 && (
          <p className="label-mono text-muted">
            {pieces} parça · {volumeM3.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m³ ·{' '}
            {weightKg.toLocaleString('tr-TR')} kg
          </p>
        )}
      </div>

      {cargoItems.length > 0 && (
        <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {cargoItems.map((item) => (
            <li key={item.itemCode} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{item.displayName}</span>
              <span className="stat shrink-0 text-muted">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      )}

      {listing.cargoDescription && (
        <p className="mt-4 border-t border-line pt-3 text-sm">{listing.cargoDescription}</p>
      )}

      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, i) => (
            <li key={photo.id} className="overflow-hidden rounded-field border border-line bg-surface-2">
              <a href={`/api/ilan/${listing.id}/foto/${photo.id}`} target="_blank" rel="noreferrer"
                className="block transition hover:opacity-90">
                {/* next/image yok: görseller oturum arkasında ve boyutları bilinmiyor */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/ilan/${listing.id}/foto/${photo.id}`} alt={`Yük fotoğrafı ${i + 1}`}
                  loading="lazy" className="aspect-square w-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
