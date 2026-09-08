import Link from 'next/link';
import type { District } from '@tasiyoruz/contracts';
import { Icon } from '@/components/ui/Icon';
import { getCorridors, getDistricts } from '@/lib/api';
import { Reveal } from './Reveal';

/**
 * Şu an iş olan koridorlar.
 *
 * <p>Ana sayfada sayı, ayrıntı ilanlar sayfasında: burada altı satır yeterli,
 * ziyaretçi hangi hatta iş olduğunu görüp o hattı açıyor. Kartlar il koduyla
 * süzülmüş listeye gidiyor — kendi hattını aramak zorunda kalmasın.
 *
 * <p>Hiç koridor yoksa bölüm hiç çizilmiyor. Boş bir "aktif ilanlar" başlığı,
 * ürünün çalışmadığı izlenimi verir — yokluğu göstermektense hiç göstermemek daha
 * dürüst.
 */
export async function ActiveCorridors() {
  const [corridors, districts] = await Promise.all([getCorridors(), getDistricts()]);
  if (!corridors || corridors.length === 0) return null;

  const total = corridors.reduce((sum, c) => sum + c.openListings, 0);
  // Koridor il ADIYLA geliyor, uç il KODU bekliyor; eşleme katalogdan
  const codeOf = new Map((districts ?? []).map((d: District) => [d.cityName, d.cityCode]));
  const href = (city: string) => {
    const code = codeOf.get(city);
    return code ? `/ilanlar?il=${code}` : '/ilanlar';
  };

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
              <li className="h-full">
                <Link
                  href={href(corridor.fromCity)}
                  className="flex h-full items-center gap-4 rounded-card border border-line bg-surface p-5 transition hover:border-[var(--route-deep)] hover:bg-surface-2"
                >
                  <span aria-hidden className="text-[var(--route-deep)]">
                    <Icon name="route" size={24} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {corridor.fromCity} → {corridor.toCity}
                    </span>
                    <span className="label-mono mt-0.5 block text-muted">
                      {corridor.openListings} açık ilan
                    </span>
                  </span>
                  <span aria-hidden className="shrink-0 text-muted">
                    <Icon name="arrowRight" size={16} />
                  </span>
                </Link>
              </li>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={120}>
          <Link
            href="/ilanlar"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-field bg-route px-5 text-sm font-bold text-[var(--route-ink)] transition duration-150 hover:bg-[var(--route-hover)] active:translate-y-px"
          >
            Açık ilanların hepsini gör
            <Icon name="arrowRight" size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
