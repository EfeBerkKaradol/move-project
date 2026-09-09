'use client';

import { useId, useMemo, useState } from 'react';

/**
 * Alış penceresi — aracın geleceği gün ve saat aralığı.
 *
 * <p>Tek bir "alış saati" yerine <strong>aralık</strong> soruluyor: taşıma trafiğe,
 * asansöre ve önceki işe bağlı, dakikası dakikasına bir randevu tutmuyor. Araç
 * sahibi de aralığa teklif veriyor; tek saat verilseydi her gecikme sözden dönme
 * gibi görünürdü.
 *
 * <p>İki taşıma biçimi aynı bileşende, çünkü ikisi de aynı veriyi üretiyor —
 * ayrılan yalnızca <em>gün</em>. Anlık taşımada gün bugündür ve sorulmuyor;
 * sorulsaydı "anlık" adının anlamı kalmazdı. Planlıda gün seçiliyor ve saatler
 * serbest: "05:30'da yola çıkacağım" diyen bir kullanıcının önüne üç hazır
 * aralık koymak, gerçek talebi olmayan bir kalıba sokmak olurdu.
 *
 * <p>Takvim ve saat için kütüphane eklenmedi: {@code input type="date"} ve
 * {@code type="time"} telefonda işletim sisteminin kendi seçicisini açıyor ve
 * klavye erişimi hazır geliyor.
 */

/** Gün içindeki hazır aralıklar: anlık taşımanın tek seçeneği, planlıda kısayol. */
const PENCERELER = [
  { id: 'sabah', label: 'Sabah', from: '08:00', to: '12:00' },
  { id: 'ogleden-sonra', label: 'Öğleden sonra', from: '12:00', to: '17:00' },
  { id: 'aksam', label: 'Akşam', from: '17:00', to: '20:00' },
] as const;

/** Bu kadar ileriye randevu alınabiliyor; ötesi gerçek bir ilan değil. */
const EN_FAZLA_GUN = 90;

/**
 * Aralığın alt sınırı. Onbeş dakikalık bir pencereye kimse teklif veremez: araç
 * sahibi trafiği ve önceki işi hesaba katmak zorunda. Sınır olmasaydı kullanıcı
 * kimsenin dönmediği bir ilan açar ve sebebini göremezdi.
 */
const EN_AZ_DAKIKA = 60;

const gunKatari = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const saatKatari = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * Yerel gün + saat → mutlak zaman. Sunucu Instant bekliyor.
 *
 * <p>Katar saat dilimi taşımıyor, yani tarayıcının yerel dilimine göre okunuyor —
 * kullanıcı "sabah 08:00" derken kendi saatini kastediyor. toISOString() bunu
 * UTC'ye çeviriyor.
 */
export const anaCevir = (gun: string, saat: string) => new Date(`${gun}T${saat}:00`);

export type Aralik = { start: string; end: string };

export type AralikSonuc =
  | { durum: 'eksik' }
  | { durum: 'gecersiz'; mesaj: string }
  | { durum: 'tamam'; start: string; end: string };

/**
 * Seçimi gönderilebilir bir aralığa çevirir; olmuyorsa sebebini söyler.
 *
 * <p>Bileşenden ayrı duruyor çünkü asıl kırılgan yer burası: saat dilimi, gün
 * sınırı ve "geçmiş mi" kontrolü. Sunucu geçersiz pencereyi zaten reddediyor,
 * ama o noktada kullanıcı formu çoktan doldurmuş oluyor.
 */
export function araligiCoz(
  gun: string,
  bas: string,
  bit: string,
  simdi: Date = new Date(),
): AralikSonuc {
  if (!gun || !bas || !bit) return { durum: 'eksik' };

  const baslangic = anaCevir(gun, bas);
  const bitis = anaCevir(gun, bit);
  if (Number.isNaN(baslangic.getTime()) || Number.isNaN(bitis.getTime())) {
    return { durum: 'gecersiz', mesaj: 'Tarih ya da saat okunamadı.' };
  }

  const dakika = (bitis.getTime() - baslangic.getTime()) / 60000;
  if (dakika <= 0) {
    return { durum: 'gecersiz', mesaj: 'Bitiş saati başlangıçtan sonra olmalı.' };
  }
  if (dakika < EN_AZ_DAKIKA) {
    return { durum: 'gecersiz', mesaj: `Aralık en az ${EN_AZ_DAKIKA} dakika olmalı.` };
  }
  if (bitis.getTime() <= simdi.getTime()) {
    return { durum: 'gecersiz', mesaj: 'Geçmiş bir saat aralığı seçilemez.' };
  }

  return { durum: 'tamam', start: baslangic.toISOString(), end: bitis.toISOString() };
}

/** Gelen ISO aralığı, hangi gün ve hangi saatler olduğuna geri çözer. */
export function cozumle(v?: Aralik | null): { gun: string; bas: string; bit: string } {
  const bos = { gun: '', bas: '', bit: '' };
  if (!v) return bos;
  const baslangic = new Date(v.start);
  const bitis = new Date(v.end);
  if (Number.isNaN(baslangic.getTime()) || Number.isNaN(bitis.getTime())) return bos;
  return { gun: gunKatari(baslangic), bas: saatKatari(baslangic), bit: saatKatari(bitis) };
}

export function PickupWindow({
  serviceModel,
  onChange,
  defaultValue,
}: {
  /** Anlık taşımada gün bugüne sabit; planlıda seçiliyor. */
  serviceModel: 'INSTANT' | 'SCHEDULED';
  /** Seçim tamamlandığında ISO başlangıç ve bitiş; eksik ya da geçersizse null. */
  onChange: (aralik: Aralik | null) => void;
  /** Önceki adımdan gelen seçim; kullanıcı aynı soruyu iki kez cevaplamasın. */
  defaultValue?: Aralik | null;
}) {
  const simdi = useMemo(() => new Date(), []);
  const bugun = gunKatari(simdi);
  const anlik = serviceModel === 'INSTANT';

  const baslangic = useMemo(() => cozumle(defaultValue), [defaultValue]);
  // Anlık taşımada gün her zaman bugün: önceki adımdan ileri bir tarih gelse bile
  // "anlık" seçildiği anda o tarihin karşılığı kalmıyor.
  const [gun, setGun] = useState(anlik ? bugun : baslangic.gun);
  const [bas, setBas] = useState(baslangic.bas);
  const [bit, setBit] = useState(baslangic.bit);

  const gunId = useId();
  const basId = useId();
  const bitId = useId();

  const etkinGun = anlik ? bugun : gun;
  const sonuc = araligiCoz(etkinGun, bas, bit, simdi);

  const enGec = useMemo(() => {
    const d = new Date(simdi);
    d.setDate(d.getDate() + EN_FAZLA_GUN);
    return gunKatari(d);
  }, [simdi]);

  const sec = (yeniGun: string, yeniBas: string, yeniBit: string) => {
    setGun(yeniGun);
    setBas(yeniBas);
    setBit(yeniBit);
    const s = araligiCoz(anlik ? bugun : yeniGun, yeniBas, yeniBit, simdi);
    onChange(s.durum === 'tamam' ? { start: s.start, end: s.end } : null);
  };

  /**
   * Bugün için bitmiş aralıklar kapatılıyor. Sunucu geçmiş pencereyi zaten
   * reddediyor; kullanıcıyı formu doldurup gönderdikten sonra değil, tıklarken
   * durdurmak daha az sinir bozucu.
   */
  const gecmis = (p: (typeof PENCERELER)[number]) =>
    etkinGun === bugun && anaCevir(etkinGun, p.to).getTime() <= simdi.getTime();

  const bugunBitti = anlik && PENCERELER.every(gecmis);

  const gunAdi = useMemo(
    () =>
      new Date(`${bugun}T12:00:00`).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
      }),
    [bugun],
  );

  return (
    <div>
      <p className="label-mono text-muted">Ne zaman alınsın?</p>
      <p className="mt-1 text-xs text-muted">
        Araç bu aralıkta geliyor. Teklifler alış saatine kadar açık kalıyor.
      </p>

      {anlik ? (
        <p className="mt-3 text-sm font-semibold">
          Bugün <span className="font-normal text-muted">· {gunAdi}</span>
        </p>
      ) : (
        <>
          <label htmlFor={gunId} className="mt-3 block text-sm font-semibold">
            Gün
          </label>
          <input
            id={gunId}
            type="date"
            value={gun}
            min={bugun}
            max={enGec}
            onChange={(e) => sec(e.target.value, bas, bit)}
            className="mt-1.5 min-h-11 w-full rounded-field border border-line bg-surface-2 px-3.5 py-2.5 text-[15px] outline-none transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25 sm:w-56"
          />
        </>
      )}

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">
          {anlik ? 'Saat aralığı' : 'Hazır aralıklar'}
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {PENCERELER.map((p) => {
            const kapali = gecmis(p);
            const secili = !kapali && bas === p.from && bit === p.to;
            return (
              <button
                key={p.id}
                type="button"
                disabled={kapali}
                aria-pressed={secili}
                onClick={() => sec(etkinGun, p.from, p.to)}
                className={[
                  'inline-flex min-h-11 flex-col items-start justify-center rounded-field border px-4 py-1.5 text-left transition',
                  kapali
                    ? 'cursor-not-allowed border-dashed border-line text-muted opacity-55'
                    : secili
                      ? 'border-[var(--route-deep)] bg-[var(--route-soft)] text-ink'
                      : 'border-line hover:border-muted',
                ].join(' ')}
              >
                <span className="text-sm font-semibold">{p.label}</span>
                <span className="label-mono text-muted">
                  {p.from}–{p.to}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Serbest saat yalnızca planlıda: anlık taşımada "yarın 03:00" diye bir
          seçim yapılabilseydi, seçilen gün bugün olduğu için sessizce geçersiz
          olurdu. Anlıkta gün bugün, aralık da bugünün kalan dilimlerinden biri. */}
      {!anlik && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={basId} className="block text-sm font-semibold">
              Başlangıç
            </label>
            <input
              id={basId}
              type="time"
              value={bas}
              onChange={(e) => sec(gun, e.target.value, bit)}
              className="mt-1.5 min-h-11 w-32 rounded-field border border-line bg-surface-2 px-3.5 py-2.5 text-[15px] outline-none transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25"
            />
          </div>
          <div>
            <label htmlFor={bitId} className="block text-sm font-semibold">
              Bitiş
            </label>
            <input
              id={bitId}
              type="time"
              value={bit}
              onChange={(e) => sec(gun, bas, e.target.value)}
              className="mt-1.5 min-h-11 w-32 rounded-field border border-line bg-surface-2 px-3.5 py-2.5 text-[15px] outline-none transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25"
            />
          </div>
        </div>
      )}

      {bugunBitti ? (
        <p className="mt-3 text-sm text-[#8a2a1f]">
          Bugünün alış aralıkları doldu. Planlı taşımaya geçip ileri bir gün seçebilirsin.
        </p>
      ) : sonuc.durum === 'gecersiz' ? (
        <p className="mt-3 text-sm text-[#8a2a1f]">{sonuc.mesaj}</p>
      ) : (
        etkinGun === bugun && (
          <p className="mt-2 text-xs text-muted">Bugün için geçmiş aralıklar seçilemiyor.</p>
        )
      )}
    </div>
  );
}
