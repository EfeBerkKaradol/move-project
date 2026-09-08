'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { BRAND } from '@/lib/brand';
import { HANDOVER } from './geo-data';
import { SceneCard } from './SceneCard';
import { SceneMap, mapProjection } from './SceneMap';
import { TruckAsset } from './TruckAsset';
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
export function HeroScene({
  shipperHref,
  carrierHref,
  widget,
}: {
  shipperHref: string;
  carrierHref: string;
  /** Fiyat sorgusu. Geniş ekranda sahnenin sağ sütununda duruyor. */
  widget?: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cityRouteRef = useRef<SVGPathElement>(null);
  const outRef = useRef<SVGPathElement>(null);
  const backRef = useRef<SVGPathElement>(null);

  /** Katmanlar bir kez toplanır; her karede DOM sorgulamak boş iş. */
  const layersRef = useRef<Map<string, HTMLElement>>(new Map());
  const shownRef = useRef<Map<string, boolean>>(new Map());
  /** Yol uzunlukları sabit; her karede getTotalLength çağırmak gereksiz. */
  const lengthsRef = useRef<Map<SVGPathElement, number>>(new Map());
  /** Harita kutusu → piksel dönüşümü; yalnızca boyut değişince yeniden kurulur. */
  const mapRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<ReturnType<typeof mapProjection> | null>(null);

  const reduced = usePrefersReducedMotion();
  /**
   * Mobil öncelikli: sunucu ve ilk kare kaba geometriyi çiziyor, masaüstü
   * bağlandıktan sonra ayrıntılıya yükseliyor.
   *
   * <p>Tersi telefona iki kez ödetiyordu: SSR çıktısı ayrıntılı yolları taşıyor
   * (HTML'de fazladan ~7 KB), telefon onları bir kez boyuyor, sonra kaba sürüme
   * geçip yeniden boyuyordu. Masaüstünde o fazladan render'ın bütçesi var.
   */
  const isWide = useMedia('(min-width: 768px)');
  const compact = isWide !== true;

  /** Kapsayıcı boyutu değişince harita→piksel dönüşümü yeniden kurulur. */
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      projectRef.current = mapProjection(rect);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

    // Açılışta sahne kapkaranlık olmamalı: harita silik de olsa oradadır,
    // kaydırma onu tam görünürlüğe çıkarır. İki sahneli yazıma geçerken bu
    // taban kaybolmuştu ve hero duruş hâlinde boş görünüyordu.
    set('--ist-in', Math.max(s.istanbulIn, 0.22 * (1 - s.handover)));
    set('--tr-in', s.turkeyIn);
    set('--ist-zoom', s.istanbulZoom);
    set('--tr-zoom', s.turkeyZoom);
    set('--truck-in', s.truckIn);
    set('--widget-in', s.widgetIn);
    set('--draw-city', s.cityDraw);
    set('--draw-out', s.outboundDraw);
    set('--draw-back', s.returnDraw);
    set('--loaded', s.returnLoaded);
    for (const [id, value] of Object.entries(s.nodes)) set(`--n-${id}`, value);

    const alphas: Record<string, number> = {
      intro: s.texts.intro,
      enterLoad: s.texts.enterLoad,
      crossing: s.texts.crossing,
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

    // ── Aracın konumu ────────────────────────────────────────────────
    // Araç görünmezken hesabı atlamak cazipti ama yanlıştı: hareket tercihi
    // çözülene kadar sahne bir kez p=1 ile uygulanıyor (dönüş bacağı, araç
    // batıya bakar) ve atlama o yönü olduğu gibi bırakıyordu. Ölçüm zaten
    // çağrı başına 0,02 ms — atlamanın kazancı yok, riski vardı.
    let x: number;
    let y: number;
    let facingRight = true;

    if (s.leg === 'handover') {
      // Kamera geri çekilirken araç şehir çıkışından ülke ölçeğindeki İstanbul'a
      // süzülüyor. İki sahne arasında görünmez bir sıçrama olmuyor.
      x = HANDOVER.from.x + (HANDOVER.to.x - HANDOVER.from.x) * s.handover;
      y = HANDOVER.from.y + (HANDOVER.to.y - HANDOVER.from.y) * s.handover;
      facingRight = HANDOVER.to.x >= HANDOVER.from.x;
    } else {
      const path =
        s.leg === 'city' ? cityRouteRef.current : s.leg === 'back' ? backRef.current : outRef.current;
      if (!path) return;

      let length = lengthsRef.current.get(path);
      if (length === undefined) {
        length = path.getTotalLength();
        lengthsRef.current.set(path, length);
      }

      const distance = length * s.legProgress;
      const at = path.getPointAtLength(distance);
      // Yön, noktanın iki yanından örnekleniyor. Yalnızca ileriye bakılsaydı yolun
      // sonunda ileri nokta noktanın kendisi olur ve araç son karede yanlış tarafa
      // dönerdi — dönüş bacağının bitişinde tam olarak bu oluyordu.
      const before = path.getPointAtLength(Math.max(0, distance - 2));
      const ahead = path.getPointAtLength(Math.min(length, distance + 2));
      x = at.x;
      y = at.y;
      facingRight = ahead.x >= before.x;
    }

    const project = projectRef.current;
    if (!project) return;
    const { left, top } = project(x, y);
    set('--truck-x', `${left}px`);
    set('--truck-y', `${top}px`);
    set('--truck-dir', facingRight ? 1 : -1);
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
          <div className="pointer-events-none absolute inset-x-0 bottom-[6%] top-[44%] md:bottom-[4%] md:top-[14%] lg:top-[20%]">
            {/* Harita, navbar'ın içeriğiyle aynı kutuya hizalanıyor: sol kenarı
                logoyla, sağ kenarı "Yük ver" düğmesiyle aynı hatta. Widget bu
                kutunun sağ ucunda, haritanın üstünde duruyor. */}
            <div className="mx-auto h-full max-w-[76rem] px-6">
              {/* Ölçüm kutusu dolgunun İÇİNDE: `absolute inset-0` dolguyu yok
                  sayar, ölçüm dış öğeden alınsaydı harita navbar içeriğinden
                  iki yandan 24 piksel taşardı. */}
              <div ref={mapRef} className="relative h-full">
              <SceneMap
                cityRouteRef={cityRouteRef}
                outRef={outRef}
                backRef={backRef}
                compact={compact}
              />

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
                <TruckAsset className="h-auto w-[clamp(5rem,13vw,9.5rem)] md:drop-shadow-[0_8px_18px_rgb(0_0_0/0.45)]" />
              </div>

              {/* Kartlar rotanın çevresinde; mobilde tek bir yuvada üst üste */}
              <SceneCard
                layer="cardCargo" icon="package" label="Yükün"
                title="12 ton · Kuru yük" meta={['Hadımköy → Ankara', 'Kapalı kasa']}
                className="left-1/2 top-2 -translate-x-1/2 md:left-[38%] md:top-[10%] md:translate-x-0"
              />
              <SceneCard
                layer="cardMatch" tone="match" icon="handshake" label="Eşleşme bulundu"
                title="3 uygun araç" meta={['İstanbul → Ankara', 'İlk teklif ~11 dk']}
                className="left-1/2 top-2 -translate-x-1/2 md:left-[44%] md:top-[10%] md:translate-x-0"
              />
              <SceneCard
                layer="cardNew" tone="match" icon="route" label="Yeni yük bulundu"
                title="8 ton · Dönüş rotanda" meta={['Ankara → İzmir', 'Sapma yok']}
                className="left-1/2 top-2 -translate-x-1/2 md:left-[38%] md:top-[64%] md:translate-x-0"
              />
              </div>
            </div>
          </div>

          {/* Metin sütununun arkasında yumuşak bir karartma. Harita navbar hizasına
              kadar sola geldiği için "İstanbul" etiketi ve rotanın batı ucu metnin
              altına giriyor; ikisi de beyaz olduğu için ikisi de okunmuyordu.
              Kart değil gradyan: sağa doğru tamamen saydamlaşıyor, harita
              kapanmıyor, yalnızca metnin arkası koyulaşıyor. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 hidden w-[46%] bg-gradient-to-r from-[rgb(23_26_25/0.92)] via-[rgb(23_26_25/0.7)] to-transparent md:block"
          />

          {/* ── FİYAT SORGUSU ──────────────────────────────────────── */}
          {/* Birincil eylem anlatı boyunca ekranda kalıyor: kullanıcı hikâyeyi
              izlerken istediği an rota girebilmeli. Yalnızca geniş ekranda —
              telefonda başlık, widget ve harita aynı ekrana sığmıyor, orada
              widget hero'nun hemen altındaki kendi bölümünde duruyor. */}
          {widget && (
            <div
              className="group pointer-events-auto absolute right-[max(1.5rem,calc((100vw-76rem)/2))] top-1/2 z-10 hidden max-h-[calc(100svh-7rem)] w-[20rem] -translate-y-1/2 overflow-y-auto lg:block xl:w-[22.5rem]"
              // Taban değer BURADA tanımlı, alt öğede değil: satır içi stil sınıf
              // tabanlı bir geçersiz kılmayı hep yener, değişken alt öğeye satır içi
              // yazıldığında hover/odak kuralı hiçbir zaman devreye girmiyordu.
              style={{ ['--widget-alpha' as string]: 'calc(0.14 + var(--widget-in, 0) * 0.86)' }}
            >
              {/*
                Açılışta silik: sahne ön planda, widget varlığını belli eden bir
                katman. Kaydırma ilerledikçe öne çıkıyor.

                Fareyle üzerine gelindiğinde ya da içine odaklanıldığında anında
                tam görünür oluyor — silik bir formu doldurmaya çalışmak,
                okunmayan alanlarla uğraşmak demekti.

                Geçiş (transition) bilerek yok: değer kaydırmayla sürülüyor,
                üstüne animasyon konunca opaklık kaydırmanın gerisinde
                sürükleniyor ve hiçbir zaman hedefe varmıyordu.
              */}
              <div
                className="opacity-[var(--widget-alpha)] group-focus-within:[--widget-alpha:1] group-hover:[--widget-alpha:1]"
              >
                {widget}
              </div>
            </div>
          )}

          {/* ── METİN KATMANLARI ───────────────────────────────────── */}
          <div className="relative mx-auto flex h-full max-w-[76rem] flex-col px-6 pt-20 md:pt-24">
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
              <div className="mt-8 flex flex-wrap items-start gap-3 lg:hidden">
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
            {/* Faz metinleri açılış başlığından dar: harita sola alındıkça rota ve şehir
                etiketleri sola yaklaşıyor, geniş bir paragraf onların üstüne biniyordu. */}
            <div className="pointer-events-none absolute inset-x-6 top-20 max-w-sm md:top-24">
              <PhaseText layer="enterLoad" kicker="Adım 1" title="Yükünü gir."
                body="Nereden nereye, ne kadar. Araç tipini bilmiyorsan sistem öneriyor." />
              <PhaseText layer="crossing" kicker="Boğaz geçişi" title="Avrupa yakasından Anadolu yakasına."
                body="Şehir içi bacak da rotanın parçası: köprü, trafik ve mesafe fiyata giriyor." />
              <PhaseText layer="arrival" kicker="Varış" title="Doğru araç. Doğru rota."
                body="Teklifleri puan ve tamamlanan işle karşılaştırdın, sen seçtin." />
              <PhaseText layer="empty" kicker="Dönüş" title={<EmptyReturnTitle />}
                body="Ankara–İzmir 580 km. Araç boş dönerse o mesafeyi kimse kazanmıyor." />
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
  // Iki kelime aynı ızgara gözünde üst üste duruyor: kutunun yüksekliğini
  // hangisi uzunsa o belirliyor. "Yüklü dönüş." mutlak konumlandırıldığında
  // kutuya yükseklik katmıyor, dar ekranda ikinci satıra düşüp altındaki
  // paragrafın üstüne biniyordu.
  return (
    <span className="grid">
      <span
        className="col-start-1 row-start-1"
        style={{ opacity: 'calc(1 - var(--loaded, 0))' }}
      >
        Boş dönüş.
      </span>
      <span
        className="col-start-1 row-start-1 text-route"
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
