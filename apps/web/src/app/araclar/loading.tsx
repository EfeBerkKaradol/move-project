import { PageSkeleton } from '@/components/site/PageSkeleton';

/**
 * Bu dosyanın tek işi var: Next'in bu rotayı bir Suspense sınırına sarması.
 * Olmadığında sayfa, filo sayaçları gelene kadar hiç HTML üretmiyordu.
 */
export default function Loading() {
  return <PageSkeleton satir={2} />;
}
