'use client';

import type { VehicleType } from '@turmove/contracts';
import { useState } from 'react';
import { VehicleGlyph } from './VehicleGlyph';

type Side = 'SHIPPER' | 'CARRIER';

/**
 * Hero'nun içindeki teklif başlatma formu.
 *
 * <p>İki sekme, ürünün iki tarafını temsil ediyor: yük veren rota + araç tipi girip
 * tahmini fiyat alıyor, araç sahibi ise koridorunu tanımlayıp kendisine düşecek
 * ilanları görüyor. Kayıt istenmeden fiyat gösterilmesi bilinçli — kullanıcıyı
 * kaydolmadan önce ikna eden tek ekran bu.
 */
export function QuoteWidget({ vehicles }: { vehicles: VehicleType[] }) {
  const [side, setSide] = useState<Side>('SHIPPER');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [vehicleCode, setVehicleCode] = useState<string | null>(null);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div className="theme-cream mt-10 rounded-card bg-bg p-4 shadow-lift sm:p-5">
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
          <Field
            id="nereden"
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
          <Field
            id="nereye"
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
          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {vehicles.map((v) => {
              const soon = !v.active;
              const selected = vehicleCode === v.code;
              return (
                <button
                  key={v.code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={soon}
                  onClick={() => setVehicleCode(v.code)}
                  className={[
                    'rounded-field border p-3 text-left transition',
                    soon
                      ? 'cursor-not-allowed border-dashed border-line text-muted'
                      : selected
                        ? 'border-amber bg-[var(--amber-soft)]'
                        : 'border-line bg-surface hover:border-muted',
                  ].join(' ')}
                >
                  <VehicleGlyph code={v.code} className="size-6" />
                  <span className="mt-2 block text-sm font-semibold">{v.displayName}</span>
                  <span className={`label-mono mt-0.5 block ${selected ? 'text-[#8a5c10]' : 'text-muted'}`}>
                    {soon ? 'Yakında' : capacityLabel(v)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="button"
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
    </div>
  );
}

function capacityLabel(v: VehicleType) {
  return v.payloadKg >= 1000
    ? `${(v.payloadKg / 1000).toLocaleString('tr-TR')} ton`
    : `${v.payloadKg} kg`;
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono text-muted">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2.5 rounded-field border border-line bg-surface-2 px-3.5">
        <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icon}
        </svg>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-3.5 pr-12 text-[15px] outline-none placeholder:text-muted"
        />
      </div>
    </div>
  );
}
