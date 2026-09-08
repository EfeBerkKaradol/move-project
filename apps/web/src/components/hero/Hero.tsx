import { BRAND } from '@/lib/brand';
import { HeroScene } from './HeroScene';

/**
 * Hero'nun sunucu tarafı.
 *
 * <p>Sahnenin kendisi dekoratif ve `aria-hidden`; sayfanın gerçek H1'i burada,
 * görsel olarak gizli ama okunabilir. Kaydırmayla kaybolan bir başlığı H1 yapmak
 * hem ekran okuyucuyu hem arama motorunu yanıltırdı.
 */
export function Hero({
  shipperHref,
  carrierHref,
  widget,
}: {
  shipperHref: string;
  carrierHref: string;
  widget?: React.ReactNode;
}) {
  return (
    <section aria-labelledby="hero-baslik">
      <h1 id="hero-baslik" className="sr-only">
        {BRAND.name} — {BRAND.slogan} {BRAND.promise.shipper} {BRAND.promise.carrier}
      </h1>
      <HeroScene shipperHref={shipperHref} carrierHref={carrierHref} widget={widget} />
    </section>
  );
}
