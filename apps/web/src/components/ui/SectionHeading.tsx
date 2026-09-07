import { Reveal } from '@/components/site/Reveal';

/**
 * Bölüm başlığı: göz etiketi + başlık + isteğe bağlı açıklama.
 * Açıklama sağda durur; başlık kendi genişliğinde nefes alsın diye.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  id?: string;
}) {
  return (
    <Reveal className="lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
      <div>
        <p className="label-mono text-muted">{eyebrow}</p>
        <h2 id={id} className="mt-3 text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.05]">
          {title}
        </h2>
      </div>
      {lead && <p className="mt-5 max-w-md text-muted lg:mt-0 lg:pb-2">{lead}</p>}
    </Reveal>
  );
}
