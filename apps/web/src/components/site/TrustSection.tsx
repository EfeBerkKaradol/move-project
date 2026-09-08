import { Icon, type IconName } from '@/components/ui/Icon';
import { LiveStats } from './LiveStats';
import { Reveal } from './Reveal';

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'shield',
    title: 'Doğrulanmış araç sahibi',
    body: 'Ruhsat, ehliyet, K belgesi ve SRC yüklenip onaylanmadan teklif verilemiyor.',
  },
  {
    icon: 'pin',
    title: 'Canlı konum',
    body: 'Yük yola çıktığı andan teslim edildiği ana kadar aracın nerede olduğunu görüyorsun.',
  },
  {
    icon: 'camera',
    title: 'Teslim kanıtı',
    body: 'Teslimde fotoğraf çekiliyor; hasar varsa kare kare kayıt altında.',
  },
  {
    icon: 'receipt',
    title: 'Şeffaf fiyat',
    body: 'Tarife dökümü açık, komisyon satırı sıfır olsa bile görünüyor.',
  },
  {
    icon: 'handshake',
    title: 'Teklif sistemi',
    body: 'Fiyatı platform dayatmıyor; araç sahipleri teklif veriyor, seçen sen oluyorsun.',
  },
];

/**
 * Güven bölümü. Her madde için devasa kart yerine ince ayraçlarla ayrılmış
 * sütunlar — lojistikte güveni anlatan şey kutunun boyutu değil, iddianın
 * doğrulanabilir olması.
 */
export function TrustSection() {
  return (
    <section className="theme-cream border-t border-line bg-bg py-14 md:py-20">
      <div className="mx-auto max-w-[76rem] px-6">
        <Reveal>
          <h2 className="max-w-xl text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.05]">
            Taşıma sadece hızlı değil, güvenli de olmalı.
          </h2>
        </Reveal>

        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={Math.min(i, 3) * 70}>
              <li className="border-t border-line pt-5">
                <span aria-hidden className="text-[var(--route-deep)]">
                  <Icon name={feature.icon} size={24} />
                </span>
                <h3 className="mt-3 font-bold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.body}</p>
              </li>
            </Reveal>
          ))}
        </ul>

        <LiveStats />
      </div>
    </section>
  );
}
