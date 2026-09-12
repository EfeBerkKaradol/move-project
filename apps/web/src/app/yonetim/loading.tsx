import { PageSkeleton } from '@/components/site/PageSkeleton';

/**
 * Operasyon paneli kendi çerçevesinde (`OpsShell`) açılıyor; iskelet yalnızca
 * içerik alanını dolduruyor, ikinci bir başlık çubuğu çizmiyor.
 */
export default function Loading() {
  return <PageSkeleton cerceve={false} />;
}
