import { Reveal } from './Reveal';

const STEPS = [
  {
    no: '01',
    title: 'Yükünü gir',
    body: 'Nereden nereye, ne kadar. Araç tipini bilmiyorsan yükünü tarif et, sistem önersin.',
  },
  {
    no: '02',
    title: 'Rotanı belirle',
    body: 'Tarih ve ek hizmetleri seç. Tahmini fiyat aralığını kayıt olmadan gör.',
  },
  {
    no: '03',
    title: 'Doğru araçla eşleş',
    body: 'Doğrulanmış araç sahipleri teklif verir; puan ve tamamlanan işe bakıp sen seçersin.',
  },
];

/**
 * Üç adım, klasik üç kart yerine yatay bir rota üzerinde.
 *
 * <p>Adımlar hero'dan gelen rota hattının üzerindeki duraklar. Koyu sahneden açık
 * zemine geçiş bandı hero'nun kendi parçası ({@code SceneTransition}); bu bölüm
 * sıralamada yer değiştirdiğinde geçişin onunla birlikte kayması gerekmiyor.
 */
export function HowItWorks() {
  return (
    <>
      <section id="nasil-calisir" className="theme-cream bg-bg pb-14 pt-4 md:pb-20">
        <div className="mx-auto max-w-[76rem] px-6">
          <Reveal>
            <p className="label-mono text-muted">Nasıl çalışır</p>
            <h2 className="mt-3 max-w-2xl text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.05]">
              Üç adım. Kayıt, fiyatı gördükten sonra.
            </h2>
          </Reveal>

          <ol className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-8">
            {/* Adımları birbirine bağlayan hat — masaüstünde yatay, mobilde dikey */}
            <span aria-hidden
              className="absolute left-[11px] top-2 h-[calc(100%-1rem)] w-px bg-line md:left-0 md:top-[11px] md:h-px md:w-full" />
            <span aria-hidden
              className="absolute left-[11px] top-2 h-[calc(100%-1rem)] w-px origin-top scale-y-100 bg-route md:left-0 md:top-[11px] md:h-px md:w-2/3" />

            {STEPS.map((step, i) => (
              <Reveal key={step.no} delay={i * 90}>
                <li className="relative pl-9 md:pl-0 md:pt-9">
                  <span aria-hidden
                    className="absolute left-0 top-0.5 grid size-[23px] place-items-center rounded-full border-2 border-route bg-bg md:top-0">
                    <span className="size-2 rounded-full bg-route" />
                  </span>
                  <p className="label-mono text-muted">{step.no}</p>
                  <h3 className="mt-2 text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
