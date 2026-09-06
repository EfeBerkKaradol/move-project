'use client';

import { useId, useState } from 'react';

/**
 * Türkiye plaka alanı: 34 ABC 123.
 *
 * <p>Girdi şablona göre parçalanıyor — önce iki hane il kodu, sonra en fazla üç harf,
 * sonra rakamlar. Serbest metin bırakılsaydı ruhsat eşleştirmesi operasyon tarafında
 * elle yapılırdı.
 */

/** Girilen metni plaka şablonuna oturtur; şablona uymayan karakterler düşer. */
export function formatPlate(raw: string): string {
  const clean = raw
    .toLocaleUpperCase('tr')
    // Türkçe harfler plakada kullanılmıyor; yanlışlıkla yazılanlar karşılığına çevriliyor
    .replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]/g, '');

  const cityCode = clean.slice(0, 2).replace(/\D/g, '');
  const rest = clean.slice(cityCode.length);
  const letters = rest.match(/^[A-Z]{0,3}/)?.[0] ?? '';
  const digits = rest.slice(letters.length).replace(/\D/g, '').slice(0, 5);

  return [cityCode, letters, digits].filter(Boolean).join(' ');
}

export function PlateInput({
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
  const [value, setValue] = useState(() => formatPlate(defaultValue));

  return (
    <>
      <input
        id={inputId}
        name={name}
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        required={required}
        disabled={disabled}
        placeholder="34 ABC 123"
        // 2 + 3 + 5 karakter + 2 boşluk
        maxLength={12}
        value={value}
        onChange={(e) => setValue(formatPlate(e.target.value))}
        className={`uppercase tracking-wide ${className}`}
        aria-describedby={`${inputId}-hint`}
      />
      <span id={`${inputId}-hint`} className="mt-1 block text-xs text-muted">
        İl kodu, harf ve rakam: 34 ABC 123.
      </span>
    </>
  );
}
