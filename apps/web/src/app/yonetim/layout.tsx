import { redirect } from 'next/navigation';
import { auth, canCallApi, homeFor, isOps } from '@/auth';
import { OpsShell } from '@/components/ops/OpsShell';
import { ApiError, apiFetch } from '@/lib/api-server';
import type { OverviewView } from '@tasiyoruz/contracts';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Operasyon paneli düzeni: rol kontrolü ve kenar çubuğu.
 *
 * <p>Rozet sayıları her sayfada çekiliyor; pano zaten aynı uca gidiyor ve yanıt
 * küçük. Uç düşerse rozetsiz devam ediliyor — menü sayaç yüzünden çökmemeli.
 */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!canCallApi(session)) redirect('/giris?callbackUrl=%2Fyonetim');
  if (!isOps(session.roles)) redirect(homeFor(session.roles));

  const badges: Record<string, number> = {};
  try {
    const o = await apiFetch<OverviewView>('/admin/overview');
    if (o.carriersPendingReview) badges['/yonetim/basvurular'] = o.carriersPendingReview;
    if (o.documentsExpiringSoon) badges['/yonetim/belgeler'] = o.documentsExpiringSoon;
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
  }

  const path = (await headers()).get('x-pathname') ?? '/yonetim';
  const role = session.roles.includes('ADMIN') ? 'Yönetici' : 'Operasyon';

  return (
    <OpsShell
      active={path}
      user={{ name: session.user?.name ?? session.user?.email ?? 'Operasyon', role }}
      badges={badges}
    >
      {children}
    </OpsShell>
  );
}
