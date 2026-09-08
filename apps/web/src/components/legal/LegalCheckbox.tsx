import Link from 'next/link';

/**
 * Hukuki beyan onay kutusu.
 *
 * <p>Üç kural birden burada duruyor, çünkü üçü de tek tek unutulabilir şeyler:
 * varsayılan olarak <strong>seçili gelmiyor</strong> (önceden işaretlenmiş bir
 * kutu rıza değildir), metnin yanında <strong>tıklanabilir bağlantı</strong> var
 * (okunamayan bir metne verilen onay bilgilendirilmiş sayılmaz) ve dokunma hedefi
 * satırın tamamı.
 *
 * <p>Bağlantı yeni sekmede açılıyor: form doldururken sözleşmeye tıklayan
 * kullanıcı, geri döndüğünde yazdıklarını kaybetmemeli.
 */
export function LegalCheckbox({
  name,
  children,
  links = [],
  required = false,
  defaultChecked = false,
  hint,
  onCheckedChange,
}: {
  name: string;
  children: React.ReactNode;
  /** Metnin altında açılan belgeler. */
  links?: { href: string; label: string }[];
  required?: boolean;
  /** Yalnızca isteğe bağlı tercihlerde (pazarlama) anlamlı; beyanlar için hep false. */
  defaultChecked?: boolean;
  hint?: string;
  /** İşaretlenme durumunu üst forma bildirir; gönder düğmesi buna bakıyor. */
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name={name}
          required={required}
          defaultChecked={defaultChecked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-[var(--route-deep)]"
        />
        <span className="text-sm leading-relaxed">{children}</span>
      </label>

      {links.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 pl-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 transition hover:text-[var(--route-deep)]"
            >
              {link.label}
            </Link>
          ))}
        </p>
      )}

      {hint && <p className="mt-1 pl-8 text-xs text-muted">{hint}</p>}
    </div>
  );
}
