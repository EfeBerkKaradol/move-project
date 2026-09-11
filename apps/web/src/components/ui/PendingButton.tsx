'use client';

import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * Sunucu eylemi (server action) gönderen düğme; gönderim sürerken bunu gösterir.
 *
 * <p>Giriş düğmesi Keycloak'a yönlendiriyor; kimlik servisi uykudaysa yönlendirme
 * bir dakikayı bulabiliyor. Düğme hiç tepki vermeyince kullanıcı bozuk sanıp
 * defalarca basıyordu. Basılınca hemen kilitleniyor ve dönen simge çıkıyor;
 * birkaç saniye geçince de neden beklediğini söyleyen bir satır beliriyor.
 */
export function PendingButton({
  children,
  pendingLabel,
  slowHint,
  slowAfterMs = 4000,
  className,
}: {
  children: React.ReactNode;
  /** Gönderim sürerken düğmede görünen metin. */
  pendingLabel: string;
  /** Bekleme uzayınca düğmenin altında görünen açıklama. */
  slowHint?: string;
  slowAfterMs?: number;
  className: string;
}) {
  const { pending } = useFormStatus();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const id = window.setTimeout(() => setSlow(true), slowAfterMs);
    return () => window.clearTimeout(id);
  }, [pending, slowAfterMs]);

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={`${className} disabled:cursor-progress disabled:opacity-80`}
      >
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2.5">
            <span
              aria-hidden
              className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            />
            {pendingLabel}
          </span>
        ) : (
          children
        )}
      </button>
      {pending && slow && slowHint && (
        <p role="status" className="mt-2 text-center text-xs text-muted">
          {slowHint}
        </p>
      )}
    </>
  );
}
