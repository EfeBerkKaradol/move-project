import type { ListingView } from '@tasiyoruz/contracts';

export function RouteLine({ l }: { l: ListingView }) {
  const place = (p: ListingView['pickup']) => `${p.cityName ?? '?'}, ${p.districtName ?? '?'}`;
  return (
    <span className="text-sm font-bold">
      {place(l.pickup)} <span className="text-muted">→</span> {place(l.dropoff)}
    </span>
  );
}
