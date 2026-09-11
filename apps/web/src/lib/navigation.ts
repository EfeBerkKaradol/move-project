/**
 * Bir bağlantı tıklaması sayfa geçişi başlatır mı?
 *
 * <p>Gezinme çubuğu yalnızca gerçekten sayfa değiştirecek tıklamalarda görünmeli.
 * Yeni sekme (target), indirme, başka alan adı ve aynı sayfadaki çapa (#bolum)
 * dışarıda kalıyor; sonuncusu gösterilseydi çubuk hiç kapanmazdı — yol
 * değişmediği için "geçiş bitti" sinyali gelmiyor.
 */
export function isPageNavigation(
  link: { href: string; target: string; download: string },
  current: URL,
): boolean {
  if (link.target && link.target !== '_self') return false;
  if (link.download) return false;
  let url: URL;
  try {
    url = new URL(link.href, current);
  } catch {
    return false;
  }
  if (url.origin !== current.origin) return false;
  return url.pathname !== current.pathname || url.search !== current.search;
}
