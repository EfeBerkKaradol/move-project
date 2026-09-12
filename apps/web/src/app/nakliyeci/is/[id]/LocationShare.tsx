'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Sürücünün konum paylaşımı.
 *
 * <p>Yük sahibi aracın nerede olduğunu göremiyordu; tek bildiği sürücünün elle
 * ilerlettiği aşamaydı. "Yola çıktım" deyip saatlerce hareket etmeyen bir işi ne
 * müşteri ne operasyon fark edebiliyordu.
 *
 * <p><strong>Açık rıza ile.</strong> Tarayıcı zaten izin soruyor, ama paylaşım
 * kendiliğinden başlamıyor: sürücü düğmeye basıyor ve istediği an durduruyor.
 * Sessizce arka planda konum toplamak, izni istemekle aynı şey değil.
 *
 * <p>Gönderim sunucudaki uca gidiyor; harita servisine dışarıdan istek çıkmıyor.
 * Sunucu otuz saniyeden sık gelen bildirimi zaten yok sayıyor, bu yüzden burada
 * ayrıca kısma yapılmıyor — iki yerde iki farklı eşik tutmak, biri değişince
 * diğerini unutmak demek.
 */
export function LocationShare({ tripId, aktifMi }: { tripId: string; aktifMi: boolean }) {
  const [paylasiyor, setPaylasiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonGonderim, setSonGonderim] = useState<Date | null>(null);
  const izleyici = useRef<number | null>(null);

  // Sayfadan ayrılınca izleyici kapanmalı: açık kalan bir watchPosition
  // telefonun GPS'ini ve pilini boşuna tüketir
  useEffect(() => () => {
    if (izleyici.current !== null) navigator.geolocation.clearWatch(izleyici.current);
  }, []);

  if (!aktifMi) return null;

  const durdur = () => {
    if (izleyici.current !== null) navigator.geolocation.clearWatch(izleyici.current);
    izleyici.current = null;
    setPaylasiyor(false);
  };

  const basla = () => {
    if (!('geolocation' in navigator)) {
      setHata('Bu cihaz konum paylaşımını desteklemiyor.');
      return;
    }
    setHata(null);
    setPaylasiyor(true);
    izleyici.current = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/is/${tripId}/konum`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
            }),
          });
          if (!res.ok) throw new Error(String(res.status));
          setSonGonderim(new Date());
          setHata(null);
        } catch {
          // Tünelde, asansörde, kapsama dışında olmak normal: paylaşımı
          // kesmiyoruz, bir sonraki konum gelince kendiliğinden düzeliyor
          setHata('Konum gönderilemedi, tekrar denenecek.');
        }
      },
      (err) => {
        setHata(
          err.code === err.PERMISSION_DENIED
            ? 'Konum izni verilmedi. Tarayıcı ayarlarından açabilirsin.'
            : 'Konum alınamadı.',
        );
        durdur();
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
  };

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <h2 className="text-base font-bold">Konum paylaşımı</h2>
      <p className="mt-1 text-sm text-muted">
        {paylasiyor
          ? 'Yük sahibi aracın nerede olduğunu görüyor. İstediğin an durdurabilirsin.'
          : 'Açtığında yük sahibi ve operasyon aracın yerini görür. Teslimden sonra iz siliniyor.'}
      </p>

      <button
        type="button"
        onClick={paylasiyor ? durdur : basla}
        className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-field px-5 text-sm font-bold transition active:translate-y-px ${
          paylasiyor
            ? 'border border-line hover:bg-surface-2'
            : 'bg-route text-[var(--route-ink)] hover:bg-[var(--route-hover)]'
        }`}
      >
        {paylasiyor ? 'Paylaşımı durdur' : 'Konum paylaşmaya başla'}
      </button>

      {sonGonderim && (
        <p className="label-mono mt-3 text-muted">
          Son bildirim {sonGonderim.toLocaleTimeString('tr-TR', { timeStyle: 'short' })}
        </p>
      )}
      {hata && <p className="mt-3 text-sm text-[var(--warning)]">{hata}</p>}
    </div>
  );
}
