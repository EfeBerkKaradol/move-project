import { permanentRedirect } from 'next/navigation';

/**
 * Eski yasal adres. Belgeler /legal altında toplandı; dışarıya verilmiş
 * bağlantılar ve arama sonuçları kırılmasın diye kalıcı yönlendirme bırakıldı.
 */
export default function Page() {
  permanentRedirect('/legal/kvkk-aydinlatma');
}
