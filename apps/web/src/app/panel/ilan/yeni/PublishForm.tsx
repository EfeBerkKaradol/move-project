'use client';

import type { CargoCategory, CargoItem, District, ExtraService, VehicleType } from '@tasiyoruz/contracts';
import { useActionState, useState } from 'react';
import { publishListing, type ActionState } from '../../actions';
import { CargoDeclaration, summarize } from './CargoDeclaration';
import { CargoPhotos } from './CargoPhotos';
import { PickupWindow } from '@/components/form/PickupWindow';
import { LegalCheckbox } from '@/components/legal/LegalCheckbox';
import { ProhibitedNotice } from '@/components/legal/ProhibitedNotice';

/**
 * Yayınla düğmesi.
 *
 * <p>Devre dışıyken sebebi yazılıyor: gerekçesiz gri bir düğme, kullanıcıyı neyi
 * eksik bıraktığını arayarak sayfada dolaştırıyor. Dar ekranda sebep alt çubukta
 * durduğu için burada tekrarlanmıyor.
 */
function SubmitButton({
  pending, missing, showReason = false, className = 'mt-5 w-full px-6 py-4',
}: {
  pending: boolean;
  missing: { short: string; long: string }[];
  /** Eksiklerin altta yazılıp yazılmayacağı; dar ekranda sebep zaten çubukta. */
  showReason?: boolean;
  className?: string;
}) {
  return (
    <>
      <button
        type="submit"
        disabled={pending || missing.length > 0}
        className={`min-h-11 rounded-field bg-route font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px disabled:opacity-60 ${className}`}
      >
        {pending ? 'Yayınlanıyor…' : 'İlanı yayınla'}
      </button>
      {showReason && missing.length > 0 && (
        <p className="mt-2 text-center text-xs text-muted">
          Yayınlamak için {missing.map((m) => m.long).join(' ve ')}.
        </p>
      )}
    </>
  );
}

/** "12 Eylül Cuma · 08:00–12:00" — seçilen aralığın okunur hâli. */
function pencereMetni({ start, end }: { start: string; end: string }) {
  const bas = new Date(start);
  const son = new Date(end);
  const gun = bas.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  const saat = (d: Date) => d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return `${gun} · ${saat(bas)}–${saat(son)}`;
}

export function PublishForm({
  pickup, dropoff, vehicle, extras, cargoItems, cargoCategories, initial,
}: {
  pickup: District;
  dropoff: District;
  vehicle: VehicleType;
  extras: ExtraService[];
  cargoItems: CargoItem[];
  cargoCategories: CargoCategory[];
  initial: {
    serviceModel: 'INSTANT' | 'SCHEDULED';
    pickupFloor: number; pickupHasElevator: boolean;
    dropoffFloor: number; dropoffHasElevator: boolean;
    extraServices: string[];
    pickupWindow: { start: string; end: string } | null;
    /** Fiyat adımında tarif edilen yük; kullanıcı burada değiştirebiliyor. */
    cargoItems: Record<string, number>;
  };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(publishListing, {});
  const [selected, setSelected] = useState<Record<string, number>>(initial.cargoItems);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [declared, setDeclared] = useState(false);
  const [alisPenceresi, setAlisPenceresi] = useState(initial.pickupWindow);
  const planli = initial.serviceModel === 'SCHEDULED';
  const chosenExtras = extras.filter((e) => initial.extraServices.includes(e.code));

  const totals = summarize(cargoItems, selected);
  // İki biçim: yan panelde eylem cümlesi, dar ekrandaki çubukta tek satıra sığan
  // kısa hâli. Uzun metin çubukta iki satıra taşıp düğmeyi sıkıştırıyordu.
  const missing = [
    totals.pieces === 0 ? { short: 'yük', long: 'yükünü seç' } : null,
    photoIds.length === 0 ? { short: 'fotoğraf', long: 'en az bir fotoğraf ekle' } : null,
    declared ? null : { short: 'beyan', long: 'hukuka uygunluk beyanını onayla' },
    alisPenceresi ? null : { short: 'tarih', long: 'alış gününü ve saat aralığını seç' },
  ].filter((m) => m !== null);

  return (
    <form
      action={action}
      // Alt çubuk sabit; olmasaydı formun son satırı onun altında kalırdı
      className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:pb-0"
    >
      <input type="hidden" name="serviceModel" value={initial.serviceModel} />
      <input type="hidden" name="vehicleTypeCode" value={vehicle.code} />
      <input type="hidden" name="pickupDistrictId" value={pickup.id} />
      <input type="hidden" name="dropoffDistrictId" value={dropoff.id} />
      <input type="hidden" name="pickupFloor" value={initial.pickupFloor} />
      <input type="hidden" name="dropoffFloor" value={initial.dropoffFloor} />
      {initial.pickupHasElevator && <input type="hidden" name="pickupHasElevator" value="on" />}
      {initial.dropoffHasElevator && <input type="hidden" name="dropoffHasElevator" value="on" />}
      <input type="hidden" name="extraServices" value={initial.extraServices.join(',')} />
      <input
        type="hidden"
        name="cargoItems"
        value={Object.entries(selected).map(([code, quantity]) => `${code}:${quantity}`).join(',')}
      />
      <input type="hidden" name="photoIds" value={photoIds.join(',')} />
      {alisPenceresi && (
        <>
          <input type="hidden" name="pickupWindowStart" value={alisPenceresi.start} />
          <input type="hidden" name="pickupWindowEnd" value={alisPenceresi.end} />
        </>
      )}

      <div className="grid gap-6">
        <div className="rounded-card border border-line bg-surface p-6">
          <p className="label-mono text-muted">Rota ve araç</p>
          <p className="mt-2 text-lg font-bold">
            {pickup.cityName}, {pickup.name} <span className="text-muted">→</span> {dropoff.cityName}, {dropoff.name}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="label-mono text-muted">Araç</dt><dd className="font-semibold">{vehicle.displayName}</dd></div>
            <div>
              <dt className="label-mono text-muted">Ne zaman</dt>
              <dd className="font-semibold">
                {alisPenceresi ? pencereMetni(alisPenceresi) : planli ? 'Planlı' : 'Anlık'}
              </dd>
            </div>
            <div><dt className="label-mono text-muted">Alış</dt><dd>{initial.pickupFloor}. kat · {initial.pickupHasElevator ? 'asansör var' : 'asansör yok'}</dd></div>
            <div><dt className="label-mono text-muted">Teslim</dt><dd>{initial.dropoffFloor}. kat · {initial.dropoffHasElevator ? 'asansör var' : 'asansör yok'}</dd></div>
          </dl>
          {chosenExtras.length > 0 && (
            <p className="mt-4 text-sm"><span className="label-mono text-muted">Ek hizmet </span>{chosenExtras.map((e) => e.displayName).join(' · ')}</p>
          )}

          {/* Her iki biçimde de: anlık taşımada bile araç sahibinin günün hangi
              diliminde geleceğini bilmesi gerekiyor. Seçim fiyat adımından
              geliyor; burası onu göstermek ve değiştirmek için. */}
          <div className="mt-6 border-t border-line pt-6">
            <PickupWindow
              serviceModel={initial.serviceModel}
              onChange={setAlisPenceresi}
              defaultValue={initial.pickupWindow}
            />
          </div>
        </div>

        <div className="rounded-card border border-line bg-surface p-6">
          <CargoDeclaration
            items={cargoItems}
            categories={cargoCategories}
            vehicle={vehicle}
            selected={selected}
            onChange={setSelected}
          />

          <div className="mt-6 border-t border-line pt-6">
            <CargoPhotos photoIds={photoIds} onChange={setPhotoIds} />
          </div>

          <div className="mt-6 border-t border-line pt-6">
            <label htmlFor="cargo" className="label-mono block text-muted">Eklemek istediğin bir şey var mı?</label>
            <textarea id="cargo" name="cargoDescription" rows={3} maxLength={1000}
              placeholder="Örn. Kırılacak eşya var. Bina girişi dar, araç kapıya yanaşamıyor."
              className="mt-1.5 w-full rounded-field border border-line bg-surface-2 px-3.5 py-3 text-[15px] outline-none placeholder:text-muted transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25" />
            <p className="mt-1 text-xs text-muted">İsteğe bağlı. Kalem listesinin anlatmadığı şeyler için.</p>
          </div>

          {/* Beyan son adımda: kullanıcı ne beyan ettiğini görmeden onaylamasın.
              Formun başına konsaydı, henüz seçilmemiş bir yük için onay alınırdı. */}
          <div className="mt-6 border-t border-line pt-6">
            <p className="label-mono text-muted">Hukuka uygunluk beyanı</p>
            <div className="mt-3">
              <ProhibitedNotice />
            </div>
            <div className="mt-4">
              <LegalCheckbox
                name="lawfulnessDeclared"
                required
                onCheckedChange={setDeclared}
                links={[
                  { href: '/legal/yasakli-esyalar', label: 'Yasaklı eşyalar' },
                  { href: '/legal/gonderici-sozlesmesi', label: 'Gönderici Sözleşmesi' },
                ]}
              >
                Taşınmasını talep ettiğim eşyanın hukuka uygun olduğunu, yasaklı veya suç
                konusu bir eşya içermediğini, eşyanın niteliği hakkında doğru ve eksiksiz
                bilgi verdiğimi ve bu beyanımın gerçeğe aykırı olması hâlinde doğabilecek
                hukuki ve cezai sonuçlardan sorumlu olabileceğimi kabul ve beyan ederim.
              </LegalCheckbox>
            </div>
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-card border border-line bg-surface p-6 lg:sticky lg:top-24">
        <p className="label-mono text-muted">Yayınlayınca ne olur</p>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          <li>1. Tarife tahmini ilana referans olarak yazılır.</li>
          <li>2. Doğrulanmış araç sahipleri {initial.serviceModel === 'INSTANT' ? '6 saat' : 'alış tarihine kadar'} teklif verir.</li>
          <li>3. Teklifleri karşılaştırır, birini seçersin. Ödeme teslimatta.</li>
        </ol>

        {totals.pieces > 0 && (
          <p className="label-mono mt-4 border-t border-line pt-4 text-muted">
            Beyanın: {totals.pieces} parça ·{' '}
            {totals.volumeM3.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m³ ·{' '}
            {totals.weightKg.toLocaleString('tr-TR')} kg
          </p>
        )}

        {state.error && <p className="mt-4 rounded-field bg-[#fbe9e7] px-3 py-2 text-sm text-[#8a2a1f]">{state.error}</p>}

        {/* Geniş ekranda düğme burada; dar ekranda alttaki sabit çubukta. İkisi aynı
            anda görünmüyor, biri display:none olduğu için erişilebilirlik ağacında da
            tek düğme kalıyor. */}
        <div className="hidden lg:block">
          <SubmitButton pending={pending} missing={missing} showReason />
        </div>
        <p className="label-mono mt-3 text-center text-muted">Komisyon dahil · Teslimatta ödeme</p>
      </aside>

      {/* Telefon ve tablette yayınla düğmesi ekranın altında sabit duruyor: eşya listesi
          uzun, düğme formun sonundayken kullanıcı her seçimden sonra sayfanın dibine
          inip geri çıkmak zorunda kalıyordu. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 pt-3 lg:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <p className="label-mono min-w-0 flex-1 text-muted">
            {missing.length > 0
              ? `Eksik: ${missing.map((m) => m.short).join(' ve ')}`
              : `${totals.pieces} parça · ${totals.volumeM3.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} m³`}
          </p>
          <SubmitButton pending={pending} missing={missing} className="w-auto shrink-0 px-6 py-3.5" />
        </div>
      </div>
    </form>
  );
}
