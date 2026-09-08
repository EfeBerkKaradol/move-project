import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Reveal } from './Reveal';

type Side = {
  eyebrow: string;
  title: string;
  points: string[];
  cta: { href: string; label: string };
  icon: IconName;
};

/**
 * Pazarın iki tarafı. Simetrik ve seyrek: kart yığını yerine iki geniş alan,
 * aralarında tek bir ayırıcı. Kullanıcı "ben hangisiyim?" sorusunu tek bakışta
 * cevaplayabilmeli.
 */
export function TwoSidedMarket({
  shipperHref,
  carrierHref,
}: {
  shipperHref: string;
  carrierHref: string;
}) {
  const sides: Side[] = [
    {
      eyebrow: 'Yükün var',
      title: 'Doğru aracı bul.',
      icon: 'package',
      points: [
        'Fiyatı görmek için üye olman gerekmiyor',
        'Teklifleri puan ve tamamlanan işle karşılaştır',
        'Canlı konum, teslim fotoğrafı, teslimatta onay',
      ],
      cta: { href: shipperHref, label: 'Ücretsiz fiyat al' },
    },
    {
      eyebrow: 'Aracın var',
      title: 'Doğru yükü bul.',
      icon: 'truck',
      points: [
        'Belgelerini bir kez yükle, onay al',
        'Rotanı gir; koridoruna düşen ilanlar sana gelsin',
        'Komisyon düşülmüş net kazancı önceden gör',
      ],
      cta: { href: carrierHref, label: 'Şoför olarak katıl' },
    },
  ];

  return (
    <section className="theme-cream bg-bg pb-14 md:pb-20">
      <div className="mx-auto max-w-[76rem] px-6">
        <Reveal>
          <h2 className="text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.05]">
            İki taraf. Tek rota.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-0">
          {sides.map((side, i) => (
            <Reveal key={side.eyebrow} delay={i * 90}>
              <div className={i === 1 ? 'md:border-l md:border-line md:pl-12' : 'md:pr-12'}>
                <p className="label-mono flex items-center gap-2 text-muted">
                  <Icon name={side.icon} size={16} />
                  {side.eyebrow}
                </p>
                <h3 className="mt-3 text-[clamp(1.5rem,3vw,2.1rem)] leading-tight">{side.title}</h3>

                <ul className="mt-7 space-y-3.5">
                  {side.points.map((point) => (
                    <li key={point} className="flex gap-3 text-[15px] leading-relaxed">
                      <span aria-hidden className="mt-1 text-[var(--route-deep)]">
                        <Icon name="check" size={16} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>

                <Link
                  href={side.cta.href}
                  className="mt-8 inline-flex items-center gap-2 rounded-field bg-route px-5 py-3 text-sm font-bold text-[var(--route-ink)] transition duration-150 hover:bg-[var(--route-hover)] active:translate-y-px"
                >
                  {side.cta.label}
                  <Icon name="arrowRight" size={16} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
