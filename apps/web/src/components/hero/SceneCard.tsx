import { Icon, type IconName } from '@/components/ui/Icon';

/**
 * Sahnenin içinde beliren küçük bilgi kartı.
 *
 * <p>Kart sayısı bilerek az: aynı anda en fazla biri görünür. Rotanın üzerine
 * onlarca kutu serpmek anlatıyı değil kalabalığı büyütür.
 */
export function SceneCard({
  layer,
  tone = 'plain',
  icon,
  label,
  title,
  meta,
  className,
}: {
  /** Sahne katman anahtarı — görünürlüğü zaman çizelgesi yönetir. */
  layer: string;
  tone?: 'plain' | 'match';
  icon: IconName;
  label: string;
  title: string;
  meta: string[];
  className?: string;
}) {
  return (
    <div
      data-layer={layer}
      className={`pointer-events-none absolute ${className ?? ''}`}
      style={{
        opacity: `var(--${layer}, 0)`,
        transform: `translateY(calc((1 - var(--${layer}, 0)) * 10px))`,
      }}
    >
      <div
        className={[
          'w-[min(17rem,72vw)] rounded-card border bg-[rgb(31_35_33/0.96)] p-3.5 md:bg-[rgb(31_35_33/0.92)] md:backdrop-blur-sm',
          tone === 'match' ? 'border-route/60' : 'border-white/12',
        ].join(' ')}
      >
        <p className="label-mono flex items-center gap-1.5 text-route">
          <Icon name={icon} size={16} />
          {label}
        </p>
        <p className="mt-2 text-sm font-bold text-white">{title}</p>
        <p className="label-mono mt-1 text-[#9aa09b]">{meta.join(' · ')}</p>
      </div>
    </div>
  );
}
