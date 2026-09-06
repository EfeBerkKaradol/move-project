'use client';

import { useId, useState } from 'react';

/**
 * Türkiye cep telefonu alanı.
 *
 * <p>Görünen değer okunurluk için gruplanıyor (0532 123 45 67), sunucuya giden değer
 * ise yalnızca rakam. İkisi ayrı: sunucudaki doğrulama boşluk kabul etmiyor ve
 * biçimlendirilmiş metni olduğu gibi göndermek, kullanıcının doğru yazdığı numarayı
 * anlamsız bir hatayla geri çevirirdi.
 */

/** Girdiden yalnızca rakamları alır ve 0 ile başlayan 11 haneye normalize eder. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('90')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return digits ? `0${digits}` : '';
}

/** 0532 123 45 67 */
export function formatPhone(normalized: string): string {
  const d = normalized.replace(/\D/g, '');
  if (!d) return '';
  const parts = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  return parts.filter(Boolean).join(' ');
}

export function PhoneInput({
  name,
  defaultValue = '',
  disabled = false,
  required = false,
  className = '',
  id,
}: {
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const [value, setValue] = useState(() => normalizePhone(defaultValue));

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <input
        id={inputId}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        required={required}
        disabled={disabled}
        placeholder="0532 123 45 67"
        // 11 hane + 3 boşluk
        maxLength={14}
        value={formatPhone(value)}
        onChange={(e) => setValue(normalizePhone(e.target.value))}
        className={`tabular-nums ${className}`}
        aria-describedby={`${inputId}-hint`}
      />
      <span id={`${inputId}-hint`} className="mt-1 block text-xs text-muted">
        Cep telefonu; 5 ile başlar.
      </span>
    </>
  );
}
