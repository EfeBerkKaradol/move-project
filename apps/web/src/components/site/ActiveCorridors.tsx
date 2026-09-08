import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { getCorridors } from '@/lib/api';
import { Reveal } from './Reveal';

/**
 * Şu an iş olan koridorlar.
 *
 * <p><strong>Neden tek tek ilan değil:</strong> ADR-0008 devam eden siparişlerin
 * herkese açık gösterilmesini reddediyor — açık bir ilanı yayınlamak "şu anda şu
 * semtteki şu ev boşaltılacak" demek ve hiçbir gecikme bunu güvenli yapmıyor.
 * Aynı karar toplu canlı sayaçları serbest bırakıyor, çünkü onlar kimseyi
 * tanımlamıyor. Bu bölüm o sınırın güvenli tarafında duruyor: il düzeyinde,
 * yalnızca sayı, eşik altındaki koridorlar hiç gösterilmiyor.
 *
 * <p>Amaç aynı: araç sahibi "burada iş var mı?" sorusunun cevabını kaydolmadan
 * görsün. Koridor ve sayı bunu söylüyor, adres söylemeye gerek yok.
 *
 * <p>Hiç koridor yoksa bölüm hiç çizilmiyor. Boş bir "aktif ilanlar" başlığı,
 * ürünün çalışmadığı izlenimi verir — yokluğu göstermektense hiç göstermemek daha
 * dürüst.
 */
export async function ActiveCorridors({ carrierHref }: { carrierHref: string }) {
  const corridors = await getCorridors();
  if (!corridors || corridors.length === 0) return null;

  const total = corridors.reduce((sum, c) => sum + c.openListings, 0);

  return (
    <section className="theme-cream bg-bg pb-20 md:pb-28">
      <div className="mx-auto max-w-[76rem] px-6">
        <Reveal className="lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
          <div>
            <p className="label-mono text-muted">Şu an yolda</p>
            <h2 className="mt-3 text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.05]">
              Bu koridorlarda yük bekliyor.
            </h2>
          </div>
          <p className="mt-5 max-w-md text-muted lg:mt-0 lg:pb-2">
            Toplam {total} açık ilan. Adres ve kişi bilgisi burada gösterilmiyor —
            taşımayı üstlenen araç sahibi görüyor.
          </p>
        </Reveal>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {corridors.map((corridor, i) => (
            <Reveal key={`${corridor.fromCity}-${corridor.toCity}`} delay={Math.min(i, 5) * 60}>
              <li className="flex h-full items-center gap-4 rounded-card border border-line bg-surface p-5">
                <span aria-hidden className="text-[var(--route-deep)]">
                  <Icon name="route" size={24} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">
                    {corridor.fromCity} → {corridor.toCity}
                  </span>
                  <span className="label-mono mt-0.5 block text-muted">
                    {corridor.openListings} açık ilan
                  </span>
                </span>
              </li>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={120}>
          <Link
            href={carrierHref}
            className="mt-8 inline-flex items-center gap-2 rounded-field bg-route px-5 py-3 text-sm font-bold text-[var(--route-ink)] transition duration-150 hover:bg-[var(--route-hover)] active:translate-y-px"
          >
            Koridoruna düşen yükleri gör
            <Icon name="arrowRight" size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
