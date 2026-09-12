import type { CarrierProfileView, DocumentKind, VehicleType } from '@tasiyoruz/contracts';
import { CARRIER_STATUS_LABELS } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth, canCallApi } from '@/auth';
import { girisHref } from '@/lib/signup-role';
import { Shell } from '@/components/app/Shell';
import { PlaceholderPage } from '@/components/site/PlaceholderPage';
import { getVehicleTypes } from '@/lib/api';
import { apiFetch } from '@/lib/api-server';
import { ApplicationForm } from './ApplicationForm';
import { DocumentUpload } from './DocumentUpload';
import { deleteDocument, submitApplication } from './actions';

export const metadata: Metadata = {
  title: 'Şoför olarak katıl',
  description: 'Belgelerini bir kez yükle, rotanı gir, koridoruna düşen yükler sana gelsin.',
};
export const dynamic = 'force-dynamic';

/** Ekranda görünme sırası; zorunluluk kuralı sunucudan geliyor, burada tekrarlanmıyor. */
const DISPLAY_ORDER: DocumentKind[] = [
  'DRIVING_LICENCE', 'VEHICLE_REGISTRATION', 'TRAFFIC_INSURANCE',
  'SRC', 'K_DOCUMENT', 'TAX_PLATE', 'CRIMINAL_RECORD',
];

/** Belge yüklenmemişken sunucudan ad gelmiyor; ekranda gösterilecek karşılıklar. */
const LABELS: Record<DocumentKind, string> = {
  DRIVING_LICENCE: 'Sürücü belgesi',
  VEHICLE_REGISTRATION: 'Araç ruhsatı',
  TRAFFIC_INSURANCE: 'Zorunlu trafik sigortası',
  SRC: 'SRC belgesi',
  K_DOCUMENT: 'K yetki belgesi',
  CRIMINAL_RECORD: 'Adli sicil kaydı',
  TAX_PLATE: 'Vergi levhası',
};

/** Son kullanma tarihi olan belgeler. */
const WITH_EXPIRY: DocumentKind[] = ['TRAFFIC_INSURANCE', 'DRIVING_LICENCE', 'SRC', 'K_DOCUMENT'];

export default async function DriverSignupPage() {
  const session = await auth();

  // Süresi dolmuş oturum da oturumsuz sayılır; aksi hâlde API 401'i sayfayı 500'e düşürür
  if (!canCallApi(session)) {
    return (
      <PlaceholderPage
        eyebrow="Araç sahibi için"
        title="Belgeleri bir kez yükle, işe başla."
        cta={{ href: girisHref('tasiyici', '/sofor-ol'), label: 'Araç sahibi olarak giriş yap ya da kaydol' }}
      >
        <p>
          Başvurmak için önce hesap açman gerekiyor. Kayıt olan herkes yük veren olarak
          başlıyor; belgelerin onaylandığında araç sahibi paneli açılıyor.
        </p>
        <p>
          Belgeleri telefonun kamerasıyla tek seferde yüklüyorsun. Onaydan sonra bir daha
          istenmiyor, yalnızca süresi dolanları yeniliyorsun.
        </p>
      </PlaceholderPage>
    );
  }

  const [profile, fleet] = await Promise.all([
    apiFetch<CarrierProfileView | undefined>('/carrier/profile'),
    getVehicleTypes(),
  ]);
  const vehicles = fleet.filter((v: VehicleType) => v.active);
  const editable = !profile || profile.status === 'DRAFT' || profile.status === 'REJECTED'
    || profile.status === 'SUSPENDED';

  const uploaded = new Map((profile?.documents ?? []).map((d) => [d.kind, d]));
  const company = Boolean(profile?.companyName);
  const kinds = DISPLAY_ORDER.filter((k) =>
    uploaded.has(k) || (profile?.missingDocuments ?? []).includes(k)
    || k === 'CRIMINAL_RECORD' || (company && k === 'TAX_PLATE'));

  const canSubmit = profile !== undefined && profile !== null
    && profile.missingDocuments.length === 0 && editable;

  return (
    <Shell eyebrow="Araç sahibi" title="Şoför olarak katıl">
      {profile && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-5 py-4">
          <span className="label-mono text-muted">Başvuru durumu</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">
            {CARRIER_STATUS_LABELS[profile.status]}
          </span>
          {profile.reviewNote && <span className="text-sm text-muted">{profile.reviewNote}</span>}
          {profile.status === 'APPROVED' && (
            <Link href="/nakliyeci"
              className="ml-auto min-h-11 inline-flex items-center rounded-field bg-route px-4 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px">
              Araç sahibi paneline git
            </Link>
          )}
        </div>
      )}

      {profile?.status === 'APPROVED' && (
        <p className="mt-3 text-sm text-muted">
          Başvurun onaylandı ve araç sahibi yetkin verildi. Panel açılmadıysa çıkış yapıp
          tekrar gir; yetki oturum yenilendiğinde devreye giriyor.
        </p>
      )}

      <section className="mt-8 rounded-card border border-line bg-surface p-6">
        <h2 className="text-lg font-bold">Başvuru bilgileri</h2>
        <p className="mt-1 text-sm text-muted">
          {editable ? 'Aracını ve plakanı gir; zorunlu belgeler araç tipine göre belirlenir.'
            : 'Başvurun incelemede, bilgiler sonuçlanana kadar değiştirilemez.'}
        </p>
        <div className="mt-5">
          <ApplicationForm profile={profile ?? null} vehicles={vehicles} editable={editable} />
        </div>
      </section>

      {profile && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Belgeler</h2>
          <p className="mt-1 text-sm text-muted">
            {profile.missingDocuments.length === 0
              ? 'Zorunlu belgelerin tamam.'
              : `${profile.missingDocuments.length} zorunlu belge eksik.`}
          </p>
          <ul className="mt-4 space-y-3">
            {kinds.map((kind) => {
              const document = uploaded.get(kind) ?? null;
              return (
                <li key={kind}>
                  <DocumentUpload
                    kind={kind}
                    displayName={document?.kindDisplayName ?? LABELS[kind]}
                    document={document}
                    required={profile.missingDocuments.includes(kind)}
                    editable={editable}
                    wantsExpiry={WITH_EXPIRY.includes(kind)}
                  />
                  {document && editable && (
                    <form action={async () => { 'use server'; await deleteDocument(document.id); }}
                      className="mt-1 pl-1">
                      <button type="submit"
                        className="min-h-11 rounded-field px-2 text-sm font-semibold text-muted transition hover:text-[#8a2a1f]">
                        Belgeyi kaldır
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>

          {canSubmit && (
            <form action={async () => { 'use server'; await submitApplication(); }} className="mt-6">
              <button type="submit"
                className="min-h-11 rounded-field bg-route px-5 py-2.5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] hover:shadow-[0_6px_18px_rgb(244_159_44_/_0.30)] active:translate-y-px">
                Başvuruyu incelemeye gönder
              </button>
            </form>
          )}
        </section>
      )}
    </Shell>
  );
}
