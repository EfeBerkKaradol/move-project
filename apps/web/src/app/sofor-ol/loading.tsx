import { PageSkeleton } from '@/components/site/PageSkeleton';

/**
 * Bu dosyanın tek işi var: Next'in bu rotayı bir Suspense sınırına sarması.
 * Olmadığında `<Link>` tıklaması sunucu cevap verene kadar görünür hiçbir şey
 * yapmıyor ve düğme bozuk sanılıyor (bkz. PageSkeleton).
 */
export default function Loading() {
  return <PageSkeleton />;
}
