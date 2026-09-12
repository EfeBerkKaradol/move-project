import type { TripLocationView } from '@tasiyoruz/contracts';
import { MAP_BOX, TURKEY_PATH, projectLonLat } from '@/components/hero/geo-data';

/** Kadrajın en dar hâli; şehir içi bir iz ülkeyi tanınmaz bir lekeye çevirmesin. */
const EN_DAR = 230;
/** İzin çevresinde bırakılan pay, izin kendi boyuna oranla. */
const PAY = 0.6;

/**
 * Aracın konum izi — kendi çizdiğimiz Türkiye haritasının üstünde.
 *
 * <p>Dışarıya bir harita servisine istek çıkmıyor: Google anahtarı istemciye
 * gömülmüyor (docs/03) ve zaten henüz yok (ANAHTARLAR #1). Anahtar geldiğinde
 * bunun yerine gerçek yol haritası konacak; o zamana kadar "araç nerede"
 * sorusunun cevabı burada.
 *
 * <p>Sunucuda çiziliyor ve koordinatlar yalnızca işin taraflarına gidiyor. İş
 * kapandığında sunucu izi siliyor, bu bileşen de boş dönüyor.
 */
export function TripTrail({ locations }: { locations: TripLocationView[] }) {
  if (locations.length === 0) return null;

  // Uçtan en yeni önce geliyor; çizgi için kronolojik sıra gerekiyor
  const sirali = [...locations].reverse();
  const noktalar = sirali.map((l) => projectLonLat(l.lng, l.lat));
  const son = noktalar[noktalar.length - 1];
  const sonKayit = sirali[sirali.length - 1];

  const xs = noktalar.map((p) => p.x);
  const ys = noktalar.map((p) => p.y);
  const genislik = Math.max((Math.max(...xs) - Math.min(...xs)) * (1 + PAY * 2), EN_DAR);
  const oran = MAP_BOX.h / MAP_BOX.w;
  const yukseklik = Math.max((Math.max(...ys) - Math.min(...ys)) * (1 + PAY * 2), genislik * oran);
  const w = Math.min(Math.max(genislik, yukseklik / oran), MAP_BOX.w);
  const h = w * oran;
  const merkezX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const merkezY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const x = Math.min(Math.max(merkezX - w / 2, 0), MAP_BOX.w - w);
  const y = Math.min(Math.max(merkezY - h / 2, 0), MAP_BOX.h - h);
  // Kadraj daraldıkça her birim daha çok piksele karşılık geliyor; sabit
  // kalınlık bırakılırsa yakın görünümde çizgi haritayı yutuyor
  const k = w / MAP_BOX.w;

  const gecen = Math.round((Date.now() - new Date(sonKayit.recordedAt).getTime()) / 60000);
  const tazelik =
    gecen < 2 ? 'az önce' : gecen < 60 ? `${gecen} dakika önce` : `${Math.round(gecen / 60)} saat önce`;

  return (
    <figure className="mt-4 overflow-hidden rounded-card border border-line bg-surface">
      <svg
        viewBox={`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`}
        className="block w-full"
        role="img"
        aria-label="Aracın konum izi"
      >
        <path d={TURKEY_PATH} fill="var(--ink)" fillOpacity={0.08} />
        {noktalar.length > 1 && (
          <path
            d={`M${noktalar.map((p) => `${p.x} ${p.y}`).join('L')}`}
            fill="none"
            stroke="var(--route-deep)"
            strokeWidth={2.2 * k}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <circle cx={son.x} cy={son.y} r={7 * k} fill="var(--route-deep)" />
      </svg>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
        <span className="label-mono text-muted">Son konum · {tazelik}</span>
        <span className="label-mono text-muted">
          {sonKayit.accuracyM != null ? `±${Math.round(sonKayit.accuracyM)} m` : 'doğruluk bilinmiyor'}
        </span>
      </figcaption>
    </figure>
  );
}
