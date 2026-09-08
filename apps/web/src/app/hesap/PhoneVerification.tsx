'use client';

import { useActionState, useState } from 'react';
import { PhoneInput } from '@/components/form/PhoneInput';
import { sendPhoneCode, verifyPhoneCode, type PhoneState } from './actions';

const FIELD =
  'min-h-11 w-full rounded-field border border-line bg-surface-2 px-3 py-2.5 text-[15px] outline-none transition hover:border-muted focus:border-route focus:ring-2 focus:ring-route/25';
const BUTTON =
  'min-h-11 rounded-field bg-route px-5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] active:translate-y-px disabled:opacity-60';

/**
 * İki adımlı telefon doğrulama.
 *
 * <p>Adım kod gönderildikten sonra değişiyor; yanlış kod girildiğinde ilk adıma
 * dönülmüyor. Dönseydi kullanıcı her hatada yeni kod istemek zorunda kalır, saatlik
 * gönderim sınırına birkaç yanlış denemeyle takılırdı.
 */
export function PhoneVerification({
  phone,
  verifiedAt,
  available,
}: {
  phone: string | null;
  verifiedAt: string | null;
  available: boolean;
}) {
  const [sendState, send, sending] = useActionState<PhoneState, FormData>(sendPhoneCode, {});
  const [verifyState, verify, verifying] = useActionState<PhoneState, FormData>(verifyPhoneCode, {});
  const [changing, setChanging] = useState(false);

  const justVerified = verifyState.verified;
  const pendingPhone = verifyState.sentTo ?? sendState.sentTo;
  const showCodeStep = !!pendingPhone && !justVerified;

  if (!available) {
    return (
      <div className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-lg font-bold">Telefon doğrulama</h2>
        <p className="mt-2 text-sm text-muted">
          SMS servisi bu ortamda henüz bağlı değil, doğrulama şu an kapalı. Bağlandığında
          numaranı buradan doğrulayabileceksin.
        </p>
      </div>
    );
  }

  if (phone && verifiedAt && !changing && !showCodeStep) {
    return (
      <div className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-lg font-bold">Telefon</h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{phone}</span>
          <span className="rounded-full bg-[#e7f3ec] px-2.5 py-0.5 text-xs font-semibold text-[#1d6b3f]">
            Doğrulandı
          </span>
        </p>
        <p className="mt-2 text-sm text-muted">
          Yük sahibi ve sürücü teslimat sırasında bu numara üzerinden iletişim kuruyor.
        </p>
        <button type="button" onClick={() => setChanging(true)} className="mt-4 text-sm font-semibold underline underline-offset-4">
          Numarayı değiştir
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <h2 className="text-lg font-bold">{phone ? 'Numaranı değiştir' : 'Telefonunu doğrula'}</h2>

      {!showCodeStep ? (
        <form action={send} className="mt-4 grid gap-3 sm:max-w-sm">
          <p className="text-sm text-muted">
            Numaranı gir, sana altı haneli bir kod göndereceğiz.
          </p>
          <label className="text-sm">
            <span className="label-mono block text-muted">Cep telefonu</span>
            <PhoneInput name="phone" required className={FIELD} />
          </label>
          {sendState.error && <p className="text-sm text-[#8a2a1f]">{sendState.error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={sending} className={BUTTON}>
              {sending ? 'Gönderiliyor…' : 'Kod gönder'}
            </button>
            {changing && (
              <button type="button" onClick={() => setChanging(false)} className="min-h-11 rounded-field border border-line px-4 text-sm font-semibold">
                Vazgeç
              </button>
            )}
          </div>
        </form>
      ) : (
        <form action={verify} className="mt-4 grid gap-3 sm:max-w-sm">
          <input type="hidden" name="sentTo" value={pendingPhone} />
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{pendingPhone}</span> numarasına gönderilen
            kodu gir. Kod 5 dakika geçerli.
          </p>
          <label className="text-sm">
            <span className="label-mono block text-muted">Doğrulama kodu</span>
            <input
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              placeholder="000000"
              className={`${FIELD} tracking-[0.4em]`}
            />
          </label>
          {verifyState.error && <p className="text-sm text-[#8a2a1f]">{verifyState.error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={verifying} className={BUTTON}>
              {verifying ? 'Doğrulanıyor…' : 'Doğrula'}
            </button>
          </div>
        </form>
      )}

      {justVerified && (
        <p className="mt-4 text-sm font-semibold text-[#1d6b3f]">Numaran doğrulandı.</p>
      )}
    </div>
  );
}
