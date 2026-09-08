import { Icon } from '@/components/ui/Icon';

/**
 * İlan oluştururken gösterilen sade bilgi kutusu.
 *
 * <p>Uyarı değil bilgilendirme tonunda: kullanıcıyı korkutan bir kırmızı kutu,
 * suç işlemeyi düşünmeyen %99'u rahatsız eder ve düşünen %1'i durdurmaz. Bilgi
 * net veriliyor, sorumluluğun kimde olduğu açıkça yazıyor.
 */
export function ProhibitedNotice() {
  return (
    <aside className="flex gap-3 rounded-field border border-line bg-surface-2 p-4">
      <span aria-hidden className="mt-0.5 shrink-0 text-[var(--route-deep)]">
        <Icon name="shield" size={20} />
      </span>
      <p className="text-sm leading-relaxed text-muted">
        Karınca üzerinden yasadışı veya yasaklı eşya taşınması yasaktır. Eşyanın
        içeriği ve hukuka uygunluğu hakkında doğru bilgi vermek göndericinin
        sorumluluğundadır.{' '}
        <a
          href="/legal/yasakli-esyalar"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-ink underline underline-offset-4"
        >
          Yasaklı eşyalar
        </a>
      </p>
    </aside>
  );
}
