'use client';

import { useId, useMemo, useState } from 'react';

/**
 * Alış penceresi — aracın geleceği gün ve saat.
 *
 * <p>İki adım: önce günün dilimi (sabah / öğleden sonra / akşam / gece), sonra o
 * dilimin saatleri. Serbest saat girişi kaldırıldı; kullanıcı "kaçta?" sorusuna
 * takvim tuşlarıyla değil, günün nasıl bölündüğünü zaten bildiği kelimelerle
 * cevap veriyor. Dilim seçilmeden saatler görünmüyor: yirmi dört düğmeyi birden
 * göstermek, seçim değil tarama işi olurdu.
 *
 * <p>Tek bir "alış saati" yerine yine <strong>aralık</strong> gönderiliyor:
 * taşıma trafiğe, asansöre ve önceki işe bağlı, dakikası dakikasına bir randevu
 * tutmuyor. Araç sahibi de aralığa teklif veriyor.
 *
 * <p>İki taşıma biçimi aynı bileşende, çünkü ikisi de aynı veriyi üretiyor —
 * ayrılan yalnızca <em>gün</em>. Anlık taşımada gün bugündür ve sorulmuyor;
 * sorulsaydı "anlık" adının anlamı kalmazdı.
 *
 * <p>Takvim için kütüphane eklenmedi: {@code input type="date"} telefonda
 * işletim sisteminin kendi seçicisini açıyor ve klavye erişimi hazır geliyor.
 */

/**
 * Günün dilimleri. Saatler <em>seçilen günün gece yarısından itibaren</em>
 * sayılıyor, bu yüzden gece dilimi 22'den 30'a gidiyor: 30 = ertesi gün 06:00.
 *
 * <p>Gece yarısını geçen bir dilimi "22:00–06:00" diye iki parçaya bölmeden
 * temsil etmenin yolu bu. Aksi hâlde her hesapta "bu saat hangi güne ait?"
 * sorusu tekrar sorulur ve bir yerde yanlış cevaplanırdı: kullanıcı 12 Eylül
 * gecesi için 02:00 seçtiğinde araç 12 Eylül sabahı gelirdi — yani seçtiği
 * andan on sekiz saat önce.
 */
const DILIMLER = [
  { id: 'sabah', label: 'Sabah', from: 6, to: 12 },
  { id: 'ogleden-sonra', label: 'Öğleden sonra', from: 12, to: 17 },
  { id: 'aksam', label: 'Akşam', from: 17, to: 22 },
  { id: 'gece', label: 'Gece', from: 22, to: 30 },
] as const;

export type DilimId = (typeof DILIMLER)[number]['id'];

/** Gecenin bittiği saat; bundan önce başlayan bir pencere bir önceki günün gecesi. */
const GECE_BITIS = 6;

/**
 * Bir saat diliminin uzunluğu.
 *
 * <p>Bir saat, araç sahibinin çalışabileceği en dar pencere: trafiği ve önceki
 * işi hesaba katmak zorunda. Daha darı, kimsenin teklif vermediği bir ilan
 * demek olurdu. Genişletmek gerekirse tek yerden — dilim listesi buna göre
 * yeniden üretiliyor.
 */
const DILIM_SAAT = 1;

/** Bu kadar ileriye randevu alınabiliyor; ötesi gerçek bir ilan değil. */
const EN_FAZLA_GUN = 90;

const gunKatari = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "06:00", "00:00" — 24'ü geçen saatler ertesi güne sarıyor. */
export const saatKatari = (saat: number) => `${String(saat % 24).padStart(2, '0')}:00`;

/**
 * Seçilen günün gece yarısından {@code saat} kadar sonrası → mutlak zaman.
 *
 * <p>Yerel saatle kuruluyor: kullanıcı "sabah 08:00" derken kendi saatini
 * kastediyor. 24'ü aşan değerler {@code Date} tarafından ertesi güne
 * taşınıyor — gece diliminin gece yarısını geçmesi bu sayede ayrı bir kural
 * gerektirmiyor.
 */
export function anaCevir(gun: string, saat: number): Date {
  const [yil, ay, gunSayisi] = gun.split('-').map(Number);
  if (!yil || !ay || !gunSayisi) return new Date(NaN);
  return new Date(yil, ay - 1, gunSayisi, saat);
}

/** İki gün arasındaki fark. Öğlen üzerinden ölçülüyor: yaz saati kayması etkilemesin. */
function gunFarki(a: string, b: string): number {
  return Math.round((anaCevir(b, 12).getTime() - anaCevir(a, 12).getTime()) / 86_400_000);
}

export type Aralik = { start: string; end: string };

/** Bir dilimin içindeki tek seçim; saatler günün gece yarısından sayılıyor. */
export type Slot = { bas: number; bit: number };

export type AralikSonuc =
  | { durum: 'eksik' }
  | { durum: 'gecersiz'; mesaj: string }
  | { durum: 'tamam'; start: string; end: string };

/** Dilimin seçilebilir saatleri. Son parça dilime sığmıyorsa kırpılıyor. */
export function dilimSaatleri(dilimId: string): Slot[] {
  const dilim = DILIMLER.find((d) => d.id === dilimId);
  if (!dilim) return [];
  const slotlar: Slot[] = [];
  for (let h = dilim.from; h < dilim.to; h += DILIM_SAAT) {
    slotlar.push({ bas: h, bit: Math.min(h + DILIM_SAAT, dilim.to) });
  }
  return slotlar;
}

/** Saatin hangi dilime düştüğü; hiçbirine düşmüyorsa null. */
export function dilimiBul(saat: number): DilimId | null {
  return DILIMLER.find((d) => saat >= d.from && saat < d.to)?.id ?? null;
}

/**
 * Seçimi gönderilebilir bir aralığa çevirir; olmuyorsa sebebini söyler.
 *
 * <p>Bileşenden ayrı duruyor çünkü asıl kırılgan yer burası: gece yarısı geçişi
 * ve "geçmiş mi" kontrolü. Sunucu geçersiz pencereyi zaten reddediyor, ama o
 * noktada kullanıcı formu çoktan doldurmuş oluyor.
 */
export function araligiCoz(
  gun: string,
  slot: Slot | null,
  simdi: Date = new Date(),
): AralikSonuc {
  if (!gun || !slot) return { durum: 'eksik' };

  const baslangic = anaCevir(gun, slot.bas);
  const bitis = anaCevir(gun, slot.bit);
  if (Number.isNaN(baslangic.getTime()) || Number.isNaN(bitis.getTime())) {
    return { durum: 'gecersiz', mesaj: 'Tarih okunamadı.' };
  }
  if (bitis.getTime() <= baslangic.getTime()) {
    return { durum: 'gecersiz', mesaj: 'Bitiş saati başlangıçtan sonra olmalı.' };
  }
  if (bitis.getTime() <= simdi.getTime()) {
    return { durum: 'gecersiz', mesaj: 'Geçmiş bir saat aralığı seçilemez.' };
  }

  return { durum: 'tamam', start: baslangic.toISOString(), end: bitis.toISOString() };
}

/**
 * Gelen ISO aralığı, hangi güne ve hangi saatlere karşılık geldiğine geri çözer.
 *
 * <p>Gece yarısından önce başlayan bir pencere bir <em>önceki</em> günün
 * gecesine ait: kullanıcı "12 Eylül gecesi 02:00" dediğinde takvimde 13 Eylül
 * yazıyor ama seçim 12 Eylül'ün gecesi. Bu çeviri ters yönde de aynı günü
 * vermezse kullanıcı ilan adımında bir gün ileri kaymış bir tarih görürdü.
 */
export function cozumle(v?: Aralik | null): { gun: string; slot: Slot | null } {
  const bos = { gun: '', slot: null };
  if (!v) return bos;

  const baslangic = new Date(v.start);
  const bitis = new Date(v.end);
  if (Number.isNaN(baslangic.getTime()) || Number.isNaN(bitis.getTime())) return bos;

  const gunTarihi = new Date(baslangic);
  if (baslangic.getHours() < GECE_BITIS) gunTarihi.setDate(gunTarihi.getDate() - 1);
  const gun = gunKatari(gunTarihi);

  const bas = baslangic.getHours() + 24 * gunFarki(gun, gunKatari(baslangic));
  const bit = bitis.getHours() + 24 * gunFarki(gun, gunKatari(bitis));
  return { gun, slot: { bas, bit } };
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
  const [slot, setSlot] = useState<Slot | null>(baslangic.slot);
  // Dilim ayrı tutuluyor: kullanıcı dilimi seçtiğinde saat henüz yok, saatlerin
  // görünmesi için de bir dilimin açık olması gerekiyor.
  const [dilim, setDilim] = useState<DilimId | null>(
    baslangic.slot ? dilimiBul(baslangic.slot.bas) : null,
  );

  const gunId = useId();
  const etkinGun = anlik ? bugun : gun;
  const sonuc = araligiCoz(etkinGun, slot, simdi);

  const enGec = useMemo(() => {
    const d = new Date(simdi);
    d.setDate(d.getDate() + EN_FAZLA_GUN);
    return gunKatari(d);
  }, [simdi]);

  /**
   * Bitmiş saatler kapatılıyor. Sunucu geçmiş pencereyi zaten reddediyor;
   * kullanıcıyı formu doldurup gönderdikten sonra değil, tıklarken durdurmak
   * daha az sinir bozucu.
   */
  const gecmis = (s: Slot) => anaCevir(etkinGun, s.bit).getTime() <= simdi.getTime();
  const dilimDoldu = (id: string) => dilimSaatleri(id).every(gecmis);

  const bildir = (yeniGun: string, yeniSlot: Slot | null) => {
    const s = araligiCoz(yeniGun, yeniSlot, simdi);
    onChange(s.durum === 'tamam' ? { start: s.start, end: s.end } : null);
  };

  const gunSec = (yeniGun: string) => {
    setGun(yeniGun);
    // Gün değişince seçili saat geçerliliğini yitirebiliyor (dün geçmiş, bugün
    // değil); seçim korunuyor, geçersizse üst bileşene null gidiyor
    bildir(yeniGun, slot);
  };

  const dilimSec = (id: DilimId) => {
    // Seçili dilime tekrar basmak bir şeyi değiştirmiyor; sıfırlasaydı kullanıcı
    // az önce seçtiği saati kazara silerdi
    if (id === dilim) return;
    setDilim(id);
    setSlot(null);
    onChange(null);
  };

  const slotSec = (s: Slot) => {
    setSlot(s);
    bildir(etkinGun, s);
  };

  const gunAdi = useMemo(
    () =>
      new Date(`${bugun}T12:00:00`).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
      }),
    [bugun],
  );

  const saatler = dilim ? dilimSaatleri(dilim) : [];

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
            onChange={(e) => gunSec(e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-field border border-line bg-surface-2 px-3.5 py-2.5 text-[15px] outline-none transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25 sm:w-56"
          />
        </>
      )}

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">Günün hangi vakti?</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {DILIMLER.map((d) => {
            const kapali = dilimDoldu(d.id);
            const secili = dilim === d.id && !kapali;
            return (
              <button
                key={d.id}
                type="button"
                disabled={kapali}
                aria-pressed={secili}
                onClick={() => dilimSec(d.id)}
                className={[
                  'inline-flex min-h-11 flex-col items-start justify-center rounded-field border px-4 py-1.5 text-left transition',
                  kapali
                    ? 'cursor-not-allowed border-dashed border-line text-muted opacity-55'
                    : secili
                      ? 'border-[var(--route-deep)] bg-[var(--route-soft)] text-ink'
                      : 'border-line hover:border-muted',
                ].join(' ')}
              >
                <span className="text-sm font-semibold">{d.label}</span>
                <span className="label-mono text-muted">
                  {saatKatari(d.from)}–{saatKatari(d.to)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Saatler dilim seçilince açılıyor. Hepsini birden göstermek yirmi altı
          düğme demekti; kullanıcı önce günün hangi vakti olduğunu biliyor,
          saati ondan sonra daraltıyor. */}
      {dilim && (
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">Saat</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {saatler.map((s) => {
              const kapali = gecmis(s);
              const secili = !kapali && slot?.bas === s.bas && slot?.bit === s.bit;
              return (
                <button
                  key={s.bas}
                  type="button"
                  disabled={kapali}
                  aria-pressed={secili}
                  onClick={() => slotSec(s)}
                  className={[
                    'inline-flex min-h-11 items-center rounded-field border px-3.5 py-1.5 text-sm tabular-nums transition',
                    kapali
                      ? 'cursor-not-allowed border-dashed border-line text-muted opacity-55'
                      : secili
                        ? 'border-[var(--route-deep)] bg-[var(--route-soft)] font-semibold text-ink'
                        : 'border-line hover:border-muted',
                  ].join(' ')}
                >
                  {saatKatari(s.bas)}–{saatKatari(s.bit)}
                </button>
              );
            })}
          </div>

          {/* Gece dilimi gece yarısını geçiyor; seçilen tarihten bir sonraki
              sabaha uzandığı ekranda yazmazsa kullanıcı bir gün şaşırır. */}
          {dilim === 'gece' && (
            <p className="mt-2 text-xs text-muted">
              00:00 ve sonrası ertesi sabaha ait.
            </p>
          )}
        </fieldset>
      )}

      {sonuc.durum === 'gecersiz' ? (
        <p className="mt-3 text-sm text-[#8a2a1f]">{sonuc.mesaj}</p>
      ) : (
        etkinGun === bugun && (
          <p className="mt-2 text-xs text-muted">Bugün için geçmiş saatler seçilemiyor.</p>
        )
      )}
    </div>
  );
}
