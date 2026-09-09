'use client';

import { useId, useMemo, useState } from 'react';

/**
 * Alış penceresi — planlı taşımada gün ve saat aralığı.
 *
 * <p>Tek bir "alış saati" yerine <strong>aralık</strong> soruluyor: taşıma trafiğe,
 * asansöre ve önceki işe bağlı, dakikası dakikasına bir randevu tutmuyor. Araç
 * sahibi de aralığa teklif veriyor; tek saat verilseydi her gecikme sözden dönme
 * gibi görünürdü.
 *
 * <p>Serbest saat girişi yerine üç hazır aralık: "13:47'de alınsın" diye bir talep
 * yok, "sabah mı öğleden sonra mı" var. Hazır aralıklar aynı zamanda bitişin
 * başlangıçtan önce olması gibi geçersiz kombinasyonları imkânsız kılıyor.
 *
 * <p>Takvim için kütüphane eklenmedi: {@code input type="date"} telefonda
 * işletim sisteminin kendi seçicisini açıyor ve klavye erişimi hazır geliyor.
 */

/** Gün içindeki aralıklar. Bitiş dışlayıcı değil; araç bu saate kadar geliyor. */
const PENCERELER = [
  { id: 'sabah', label: 'Sabah', from: '08:00', to: '12:00' },
  { id: 'ogleden-sonra', label: 'Öğleden sonra', from: '12:00', to: '17:00' },
  { id: 'aksam', label: 'Akşam', from: '17:00', to: '20:00' },
] as const;

/** Bu kadar ileriye randevu alınabiliyor; ötesi gerçek bir ilan değil. */
const EN_FAZLA_GUN = 90;

const gunKatari = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Yerel gün + saat → mutlak zaman. Sunucu Instant bekliyor.
 *
 * <p>Katar saat dilimi taşımıyor, yani tarayıcının yerel dilimine göre okunuyor —
 * kullanıcı "sabah 08:00" derken kendi saatini kastediyor. toISOString() bunu
 * UTC'ye çeviriyor.
 */
export const anaCevir = (gun: string, saat: string) => new Date(`${gun}T${saat}:00`);

/**
 * Seçimden gönderilecek aralığı üretir; eksik ya da geçmiş seçimde null.
 *
 * <p>Bileşenden ayrı duruyor çünkü asıl kırılgan yer burası: saat dilimi ve
 * "geçmiş mi" kontrolü. Sunucu geçmiş pencereyi zaten reddediyor, ama o noktada
 * kullanıcı formu çoktan doldurmuş oluyor.
 */
/** Gelen ISO aralığı, hangi gün ve hangi hazır pencere olduğuna geri çözer. */
export function cozumle(v?: { start: string; end: string } | null): { gun: string; pencere: string } {
  if (!v) return { gun: '', pencere: '' };
  const bas = new Date(v.start);
  if (Number.isNaN(bas.getTime())) return { gun: '', pencere: '' };
  const saat = `${String(bas.getHours()).padStart(2, '0')}:${String(bas.getMinutes()).padStart(2, '0')}`;
  const p = PENCERELER.find((x) => x.from === saat);
  return { gun: gunKatari(bas), pencere: p?.id ?? '' };
}

export function pencereAraligi(
  gun: string,
  pencereId: string,
  simdi: Date = new Date(),
): { start: string; end: string } | null {
  const p = PENCERELER.find((x) => x.id === pencereId);
  if (!gun || !p) return null;
  const bitis = anaCevir(gun, p.to);
  if (Number.isNaN(bitis.getTime()) || bitis.getTime() <= simdi.getTime()) return null;
  return { start: anaCevir(gun, p.from).toISOString(), end: bitis.toISOString() };
}

export function PickupWindow({
  onChange,
  defaultValue,
}: {
  /** Seçim tamamlandığında ISO başlangıç ve bitiş; eksikse null. */
  onChange: (aralik: { start: string; end: string } | null) => void;
  /** Önceki adımdan gelen seçim; kullanıcı aynı soruyu iki kez cevaplamasın. */
  defaultValue?: { start: string; end: string } | null;
}) {
  const bugun = useMemo(() => new Date(), []);
  const baslangic = useMemo(() => cozumle(defaultValue), [defaultValue]);
  const [gun, setGun] = useState(baslangic.gun);
  const [pencere, setPencere] = useState<string>(baslangic.pencere);
  const gunId = useId();

  const enGec = useMemo(() => {
    const d = new Date(bugun);
    d.setDate(d.getDate() + EN_FAZLA_GUN);
    return gunKatari(d);
  }, [bugun]);

  /**
   * Bugün seçildiyse bitmiş aralıklar kapatılıyor. Sunucu geçmiş pencereyi zaten
   * reddediyor; kullanıcıyı formu doldurup gönderdikten sonra değil, tıklarken
   * durdurmak daha az sinir bozucu.
   */
  const gecmis = (p: (typeof PENCERELER)[number]) =>
    gun === gunKatari(bugun) && anaCevir(gun, p.to).getTime() <= Date.now();

  const sec = (yeniGun: string, yeniPencere: string) => {
    setGun(yeniGun);
    setPencere(yeniPencere);
    onChange(pencereAraligi(yeniGun, yeniPencere));
  };

  return (
    <div>
      <p className="label-mono text-muted">Ne zaman alınsın?</p>
      <p className="mt-1 text-xs text-muted">
        Araç bu aralıkta geliyor. Teklifler alış saatine kadar açık kalıyor.
      </p>

      <label htmlFor={gunId} className="mt-3 block text-sm font-semibold">
        Gün
      </label>
      <input
        id={gunId}
        type="date"
        value={gun}
        min={gunKatari(bugun)}
        max={enGec}
        onChange={(e) => sec(e.target.value, pencere)}
        className="mt-1.5 min-h-11 w-full rounded-field border border-line bg-surface-2 px-3.5 py-2.5 text-[15px] outline-none transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25 sm:w-56"
      />

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">Saat aralığı</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {PENCERELER.map((p) => {
            const kapali = gecmis(p);
            const secili = pencere === p.id && !kapali;
            return (
              <button
                key={p.id}
                type="button"
                disabled={kapali}
                aria-pressed={secili}
                onClick={() => sec(gun, p.id)}
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
        {gun === gunKatari(bugun) && (
          <p className="mt-2 text-xs text-muted">Bugün için geçmiş aralıklar seçilemiyor.</p>
        )}
      </fieldset>
    </div>
  );
}
