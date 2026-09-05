'use client';

import type { VehicleType } from '@tasiyoruz/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { VehiclePicker } from '@/components/estimate/VehiclePicker';
import { PlaceSearch } from './PlaceSearch';

type Side = 'SHIPPER' | 'CARRIER';

/**
 * Hero'nun içindeki teklif başlatma formu.
 *
 * <p>İki sekme, ürünün iki tarafını temsil ediyor: yük veren rota + araç tipi girip
 * tahmini fiyat alıyor, araç sahibi ise koridorunu tanımlayıp kendisine düşecek
 * ilanları görüyor. Kayıt istenmeden fiyat gösterilmesi bilinçli — kullanıcıyı
 * kaydolmadan önce ikna eden tek ekran bu.
 *
 * <p>Form gerçek bir GET formu: JS yokken de tarayıcı alanları sorgu dizesiyle
 * hedefe taşır. JS varken aynı işi boş alanları atlayarak yapıyoruz.
 */
const TARGET: Record<Side, string> = {
  SHIPPER: '/fiyat-hesapla',
  CARRIER: '/sofor-ol',
};

export function QuoteWidget({ vehicles }: { vehicles: VehicleType[] }) {
  const router = useRouter();
  const [side, setSide] = useState<Side>('SHIPPER');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [vehicleCode, setVehicleCode] = useState<string | null>(null);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from.trim()) params.set('nereden', from.trim());
    if (to.trim()) params.set('nereye', to.trim());
    if (vehicleCode) params.set('arac', vehicleCode);
    const query = params.toString();
    router.push(query ? `${TARGET[side]}?${query}` : TARGET[side]);
  };

  return (
    <form
      action={TARGET[side]}
      onSubmit={submit}
      className="theme-cream mt-10 rounded-card bg-bg p-4 shadow-lift sm:p-5 lg:mt-0"
    >
      {/* Sekmeler */}
      <div role="tablist" aria-label="Taraf seçimi" className="flex gap-1 rounded-field bg-surface-2 p-1">
        {(
          [
            ['SHIPPER', 'Yük vereceğim'],
            ['CARRIER', 'Aracım var'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={side === value}
            onClick={() => setSide(value)}
            className={`flex-1 rounded-[0.5rem] px-4 py-3 text-sm font-semibold transition ${
              side === value ? 'bg-surface text-ink shadow-card' : 'text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {/* Değiştir butonu iki alanın sınırında duruyor; bu yüzden ikisini de
            saran bir kapsayıcıya göre konumlanıyor. */}
        <div className="relative space-y-4">
          <PlaceSearch
            id="nereden"
            name="nereden"
            label="Nereden"
            value={from}
            onChange={setFrom}
            placeholder="İstanbul, Hadımköy"
            icon={
              <>
                <path d="M8 14.5s5-4.2 5-7.9A5 5 0 0 0 3 6.6c0 3.7 5 7.9 5 7.9Z" />
                <circle cx="8" cy="6.6" r="1.9" />
              </>
            }
          />
          <PlaceSearch
            id="nereye"
            name="nereye"
            label="Nereye"
            value={to}
            onChange={setTo}
            placeholder="Ankara, Ostim"
            icon={<path d="M2.5 8h11M9.5 4.5 13 8l-3.5 3.5" />}
          />
          <button
            type="button"
            onClick={swap}
            aria-label="Alış ve teslim noktalarını değiştir"
            className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-ink shadow-card transition hover:bg-surface-2"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor"
              strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 2.5v11M5 13.5 2.5 11M11 13.5v-11M11 2.5 13.5 5" />
            </svg>
          </button>
        </div>

        <fieldset>
          <legend className="label-mono text-muted">Araç tipi</legend>
          <input type="hidden" name="arac" value={vehicleCode ?? ''} />
          <div className="mt-2.5">
            <VehiclePicker vehicles={vehicles} value={vehicleCode} onChange={setVehicleCode} />
          </div>
        </fieldset>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-field bg-amber px-6 py-4 font-bold text-[var(--amber-ink)] transition hover:brightness-105"
        >
          {side === 'SHIPPER' ? 'Tahmini fiyatı gör' : 'Koridoruma düşen yükleri gör'}
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2.5 8h11M9.5 4.5 13 8l-3.5 3.5" />
          </svg>
        </button>

        <p className="label-mono text-center text-muted">
          Kayıt gerekmez · Tahmini aralık · Komisyon dahil
        </p>
      </div>
    </form>
  );
}
