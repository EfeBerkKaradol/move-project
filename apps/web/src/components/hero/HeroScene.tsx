'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { BRAND } from '@/lib/brand';
import { SceneCard } from './SceneCard';
import { TruckAsset } from './TruckAsset';
import { TurkeyMap } from './TurkeyMap';
import { toPercent } from './map-geometry';
import { sceneAt } from './timeline';
import { useMedia, usePrefersReducedMotion, useScrollProgress } from './useScrollProgress';

/**
 * Hero: kaydırmayla ilerleyen bir lojistik anlatısı.
 *
 * <p>Her faz ürünün bir mekanizmasını gösteriyor — yükünü gir, rota çizilir, araç
 * gider, varır, boş dönecekken dönüşüne yük bulunur. Kullanıcı bu sahneyi izledikten
 * sonra "boş dönüş eşleştirme" cümlesini açıklamaya gerek kalmıyor.
 *
 * <p><strong>Kare başına React yok.</strong> Kaydırma ilerlemesi doğrudan CSS
 * değişkenlerine yazılıyor; opaklık ve kayma CSS tarafında hesaplanıyor. Tek istisna
 * aracın konumu: SVG yolu üzerindeki nokta yalnızca JS ile bulunabiliyor.
 */
export function HeroScene({ shipperHref, carrierHref }: { shipperHref: string; carrierHref: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<SVGPathElement>(null);
  const backRef = useRef<SVGPathElement>(null);

  /** Katmanlar bir kez toplanır; her karede DOM sorgulamak boş iş. */
  const layersRef = useRef<Map<string, HTMLElement>>(new Map());
  const shownRef = useRef<Map<string, boolean>>(new Map());
  /** Yol uzunlukları sabit; her karede getTotalLength çağırmak gereksiz. */
  const lengthsRef = useRef<{ out: number; back: number } | null>(null);

  const reduced = usePrefersReducedMotion();
  const isCompact = useMedia('(max-width: 767px)');

  useEffect(() => {
    const root = sceneRef.current;
    if (!root) return;
    const map = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>('[data-layer]').forEach((el) => {
      map.set(el.dataset.layer!, el);
    });
    layersRef.current = map;
  }, []);

  const apply = useCallback((p: number) => {
    const root = sceneRef.current;
    if (!root) return;
    const s = sceneAt(p);

    const set = (key: string, value: number | string) => root.style.setProperty(key, String(value));

    // Haritanın taban görünürlüğü: açılışta sahne kapkaranlık olmamalı, rota ve
    // düğümler siliktir ama oradadır. Kaydırma bunu tam görünürlüğe çıkarır.
    set('--map-in', 0.2 + s.mapIn * 0.8);
    set('--truck-in', s.truckIn);
    set('--draw-out', s.outboundDraw);
    set('--draw-back', s.returnDraw);
    set('--loaded', s.returnLoaded);
    set('--n-istanbul', 0.25 + s.nodes.istanbul * 0.75);
    set('--n-ankara', 0.25 + s.nodes.ankara * 0.75);
    set('--n-izmir', 0.25 + s.nodes.izmir * 0.75);

    const alphas: Record<string, number> = {
      intro: s.texts.intro,
      enterLoad: s.texts.enterLoad,
      arrival: s.texts.arrival,
      empty: s.texts.empty,
      outro: s.texts.outro,
      cardCargo: s.cards.cargo,
      cardMatch: s.cards.match,
      cardNew: s.cards.newLoad,
    };

    for (const [key, alpha] of Object.entries(alphas)) {
      set(`--${key}`, alpha);
      // Görünmez bir katman tıklanabilir ve ekran okuyucuya açık kalmamalı.
      // Yazma yalnızca eşik geçildiğinde: her karede stil yazmak pahalı.
      const visible = alpha > 0.02;
      if (shownRef.current.get(key) !== visible) {
        shownRef.current.set(key, visible);
        const el = layersRef.current.get(key);
        if (el) {
          el.style.visibility = visible ? 'visible' : 'hidden';
          el.setAttribute('aria-hidden', visible ? 'false' : 'true');
        }
      }
    }

    const path = s.leg === 'out' ? outRef.current : backRef.current;
    if (path) {
      if (!lengthsRef.current) {
        lengthsRef.current = {
          out: outRef.current?.getTotalLength() ?? 0,
          back: backRef.current?.getTotalLength() ?? 0,
        };
      }
      const length = s.leg === 'out' ? lengthsRef.current.out : lengthsRef.current.back;
      const distance = length * s.legProgress;
      const at = path.getPointAtLength(distance);
      // Yön, noktanın iki yanından örnekleniyor. Yalnızca ileriye bakılsaydı yolun
      // sonunda ileri nokta noktanın kendisi olur ve araç son karede yanlış tarafa
      // dönerdi — dönüş bacağının bitişinde tam olarak bu oluyordu.
      const before = path.getPointAtLength(Math.max(0, distance - 2));
      const ahead = path.getPointAtLength(Math.min(length, distance + 2));
      const { left, top } = toPercent(at.x, at.y);
      set('--truck-x', `${left}%`);
      set('--truck-y', `${top}%`);
      set('--truck-dir', ahead.x >= before.x ? 1 : -1);
    }
  }, []);

  useScrollProgress(wrapperRef, apply, reduced === false);

  return (
    <div
      ref={wrapperRef}
      data-hero
      className="relative theme-dark bg-bg text-ink"
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        {/* Sahnenin tamamı dekoratif: okunabilir karşılığı aşağıdaki gizli başlık
            ve hero'dan sonraki bölümler. Ekran okuyucu kaydırma animasyonunun
            içinde kaybolmamalı. */}
        <div ref={sceneRef} className="relative flex-1">
          {/* ── HARİTA ─────────────────────────────────────────────── */}
          {/* Mobilde harita alt yarıda ve tam genişlikte; masaüstünde sağ-alt bölgeye
              çekiliyor. Rota, başlık sütununun üzerinden geçmemeli — araç metnin
              üstünden geçerse ikisi de okunmaz oluyor. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[44%] md:bottom-0 md:left-[24%] md:right-0 md:top-[18%]">
            <div className="relative size-full">
              <TurkeyMap outRef={outRef} backRef={backRef} compact={isCompact === true} />

              {/* Araç: harita kutusunun üstünde, rota noktasına oturuyor */}
              <div
                className="pointer-events-none absolute"
                style={{
                  left: 'var(--truck-x, 28%)',
                  top: 'var(--truck-y, 20%)',
                  opacity: 'var(--truck-in, 0)',
                  transform: 'translate(-50%, -72%) scaleX(var(--truck-dir, 1))',
                }}
              >
                <TruckAsset className="h-auto w-[clamp(7rem,20vw,13rem)] drop-shadow-[0_10px_22px_rgb(0_0_0/0.45)]" />
              </div>

              {/* Kartlar rotanın çevresinde; mobilde tek bir yuvada üst üste */}
              <SceneCard
                layer="cardCargo" icon="package" label="Yükün"
                title="12 ton · Kuru yük" meta={['İstanbul → Ankara', 'Kapalı kasa']}
                className="left-1/2 top-2 -translate-x-1/2 md:left-[10%] md:top-[34%] md:translate-x-0"
              />
              <SceneCard
                layer="cardMatch" tone="match" icon="handshake" label="Eşleşme bulundu"
                title="3 uygun araç" meta={['İstanbul → Ankara', 'İlk teklif ~11 dk']}
                className="left-1/2 top-2 -translate-x-1/2 md:left-auto md:right-[8%] md:top-[24%] md:translate-x-0"
              />
              <SceneCard
                layer="cardNew" tone="match" icon="route" label="Yeni yük bulundu"
                title="8 ton · Dönüş rotanda" meta={['Ankara → İzmir', 'Sapma yok']}
                className="left-1/2 top-2 -translate-x-1/2 md:left-[6%] md:top-[58%] md:translate-x-0"
              />
            </div>
          </div>

          {/* ── METİN KATMANLARI ───────────────────────────────────── */}
          <div className="relative mx-auto flex h-full max-w-[76rem] flex-col px-6 pt-24 md:pt-32">
            {/* Açılış */}
            <div
              data-layer="intro"
              className="max-w-xl"
              style={{
                opacity: 'var(--intro, 1)',
                transform: 'translateY(calc((1 - var(--intro, 1)) * -18px))',
              }}
            >
              <p className="label-mono text-route">{BRAND.name} · 81 il</p>
              <p
                aria-hidden
                className="mt-4 text-[clamp(2.6rem,8.2vw,5.6rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.045em]"
              >
                {BRAND.sloganWords.map((word) => (
                  <span key={word} className="block">
                    {word}
                  </span>
                ))}
              </p>
              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted md:text-base">
                {BRAND.promise.shipper}
                <br />
                {BRAND.promise.carrier}
              </p>
              <div className="mt-8 flex flex-wrap items-start gap-3">
                <ButtonLink href={shipperHref} size="lg" hint="Aracını bul.">
                  Yüküm var
                  <Icon name="arrowRight" size={16} />
                </ButtonLink>
                <ButtonLink href={carrierHref} size="lg" variant="secondary" hint="Yükünü bul.">
                  Aracım var
                </ButtonLink>
              </div>
            </div>

            {/* Sonraki fazların metinleri aynı yuvada sırayla belirir */}
            <div className="pointer-events-none absolute inset-x-6 top-24 max-w-xl md:top-32">
              <PhaseText layer="enterLoad" kicker="Adım 1" title="Yükünü gir."
                body="Nereden nereye, ne kadar. Araç tipini bilmiyorsan sistem öneriyor." />
              <PhaseText layer="arrival" kicker="Varış" title="Doğru araç. Doğru rota."
                body="Teklifleri puan ve tamamlanan işle karşılaştırdın, sen seçtin." />
              <PhaseText layer="empty" kicker="Dönüş" title={<EmptyReturnTitle />}
                body="453 km dönüş yolu. Araç boş dönerse o mesafeyi kimse kazanmıyor." />
              <PhaseText layer="outro" kicker={BRAND.slogan} title="Boş dönme."
                body="Gittiğin yola uygun yükleri bul; dönüşün de kazansın."
                action={
                  <div className="pointer-events-auto mt-7 flex flex-wrap gap-3">
                    <ButtonLink href={carrierHref} size="lg">
                      Yük bul
                      <Icon name="arrowRight" size={16} />
                    </ButtonLink>
                    <ButtonLink href={shipperHref} size="lg" variant="secondary">
                      Yük ver
                    </ButtonLink>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Fazların ortak metin bloğu — hepsi aynı yuvada, sırayla. */
function PhaseText({
  layer,
  kicker,
  title,
  body,
  action,
}: {
  layer: string;
  kicker: string;
  title: React.ReactNode;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-layer={layer}
      style={{
        visibility: 'hidden',
        opacity: `var(--${layer}, 0)`,
        transform: `translateY(calc((1 - var(--${layer}, 0)) * 14px))`,
      }}
      className="absolute inset-x-0 top-0"
    >
      <p className="label-mono text-route">{kicker}</p>
      <p className="mt-3 text-[clamp(1.9rem,5.4vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.04em]">
        {title}
      </p>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">{body}</p>
      {action}
    </div>
  );
}

/**
 * "Boş dönüş" → "Yüklü dönüş" geçişi.
 *
 * <p>Sitenin en önemli tek cümlesi. İki kelime üst üste duruyor ve --loaded ile
 * yer değiştiriyor; kullanıcı kelimenin değiştiğini görüyor, yeni bir cümle
 * okumuyor.
 */
function EmptyReturnTitle() {
  return (
    <span className="relative inline-block">
      <span
        className="block"
        style={{ opacity: 'calc(1 - var(--loaded, 0))' }}
      >
        Boş dönüş.
      </span>
      <span
        className="absolute inset-0 block text-route"
        style={{
          opacity: 'var(--loaded, 0)',
          transform: 'translateY(calc((1 - var(--loaded, 0)) * 12px))',
        }}
      >
        Yüklü dönüş.
      </span>
    </span>
  );
}
