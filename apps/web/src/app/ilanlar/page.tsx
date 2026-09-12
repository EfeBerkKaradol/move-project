import type { District, VehicleType } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth, isDriver } from '@/auth';
import { ProvinceList, ProvinceMap, type MapRoute, type ProvinceStat } from '@/components/map/ProvinceMap';
import { districtsOf } from '@/components/map/districts';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { Icon } from '@/components/ui/Icon';
import { getDistricts, getPublicListings, getVehicleTypes } from '@/lib/api';
import { normalize } from '@/lib/places';
import { projectLonLat } from '@/components/hero/geo-data';

export const metadata: Metadata = {
  title: 'Açık ilanlar',
  description: 'Şu an teklif bekleyen yükler: nereden nereye, hangi araç, ne kadar büyük.',
};

type Params = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * Açık ilanlar panosu — giriş gerektirmiyor.
 *
 * <p>Koridor sayaçları "bu hatta iş var" diyordu ama araç sahibi adayına işin neye
 * benzediğini göstermiyordu; kaydolmadan önce ürünün boş olmadığını görmek istiyor.
 * Bu sayfa ilanları tek tek gösteriyor.
 *
 * <p><strong>Sınır:</strong> rota (ilçe düzeyinde), araç, büyüklük ve tarife tahmini
 * var. Fotoğraf, yük açıklaması, kalem dökümü, kat/asansör ve yük verenin kimliği
 * yok — onlar teklif için gereken ayrıntılar ve onaylı araç sahibine açılıyor.
 * Sunucu da bunları hiç göndermiyor, gizleme burada değil uçta yapılıyor.
 */
export default async function PublicListingsPage({ searchParams }: { searchParams: Params }) {
  // searchParams bir ağ isteği değil; süzgeçleri önce okumak hiçbir şeye mal
  // olmuyor ve aşağıdaki tek dalgayı mümkün kılıyor.
  const p = await searchParams;
  const vehicleFilter = first(p.arac);
  // Ana sayfadaki koridor kartı buraya il koduyla geliyor; ziyaretçi kendi hattını
  // aramak zorunda kalmasın
  const cityFilter = first(p.il);
  // Araç süzgeci sunucuda değil burada uygulanıyor: çiplerin yanındaki sayılar için
  // zaten o ildeki bütün ilanlar gerekiyor ve iki istek atmanın anlamı yok. (Uç en
  // fazla 60 ilan dönüyor; sayılar o üst sınırın içinden.)
  // İki liste: haritanın sayaçları bütün illeri bilmek zorunda, liste ise
  // seçilen ilin ilanlarını sunucudan süzülmüş hâlde istiyor. Süzgeç yokken
  // ikisi aynı istek. (Uç en fazla 60 ilan dönüyor; sayılar o üst sınırın
  // içinden — haritada gösterilen sayı, listede görülebilecek sayı.)
  /*
   * Hepsi TEK dalgada. Eskiden katalog (araçlar + ilçeler) beklendikten SONRA
   * ilanlar isteniyordu; ilanlar katalogdan türemediği hâlde onu bekliyordu. API
   * uykudayken iki zaman aşımı arka arkaya binip sayfayı 6 yerine 12 saniye
   * HTML'siz bırakıyordu.
   */
  const [session, vehicles, districts, tumIller, secilenIl] = await Promise.all([
    auth(),
    getVehicleTypes(),
    getDistricts(),
    getPublicListings(),
    cityFilter ? getPublicListings({ city: cityFilter }) : Promise.resolve(null),
  ]);
  const all = secilenIl ?? tumIller;
  const listings = vehicleFilter ? (all ?? []).filter((l) => l.vehicleTypeCode === vehicleFilter) : all;

  /*
   * Haritadaki sayılar araç süzgecini de yansıtıyor: yansıtmasaydı kullanıcı
   * boyalı bir ile tıklayıp boş liste bulurdu.
   */
  const haritaIlanlari = vehicleFilter
    ? (tumIller ?? []).filter((l) => l.vehicleTypeCode === vehicleFilter)
    : (tumIller ?? []);
  const ilanSayisi = new Map<string, number>();
  for (const l of haritaIlanlari) {
    const k = normalize(l.fromCity);
    ilanSayisi.set(k, (ilanSayisi.get(k) ?? 0) + 1);
  }
  const iller = new Map<string, string>();
  for (const d of districts ?? []) iller.set(d.cityCode, d.cityName);
  const provinceStats: ProvinceStat[] = [...iller].map(([cityCode, name]) => ({
    name,
    cityCode,
    count: ilanSayisi.get(normalize(name)) ?? 0,
  }));
  const cityName = cityFilter
    ? (districts ?? []).find((d: District) => d.cityCode === cityFilter)?.cityName ?? null
    : null;

  const signedInDriver = !!session && isDriver(session.roles ?? []);
  // Araç sahibi olmayan ziyaretçi teklif veremiyor; onu yükü göremeyeceği bir
  // giriş ekranına değil, ne yapması gerektiğini anlatan sayfaya gönderiyoruz.
  const detailHref = (id: string) => (signedInDriver ? `/nakliyeci/ilan/${id}` : '/sofor-ol');

  /*
   * İl içi ilanların haritadaki izi: alış ve teslim aynı ilde. Koordinatlar
   * sunucuda projekte ediliyor, istemciye ilçe enlem/boylamı taşınmıyor.
   * Koordinatı bulunamayan ilan çizilmiyor ama listede duruyor — eksik bir
   * katalog kaydı yüzünden iş gizlenmemeli.
   */
  const konum = new Map((districts ?? []).map((d: District) => [d.id, d]));
  const ilIciRotalar: MapRoute[] = cityFilter
    ? (listings ?? []).flatMap((l) => {
        const a = konum.get(l.fromDistrictId);
        const b = konum.get(l.toDistrictId);
        if (!a || !b || a.cityCode !== cityFilter || b.cityCode !== cityFilter) return [];
        return [{
          id: l.id,
          label: `${a.name} → ${b.name} · ${l.vehicleTypeCode}`,
          from: projectLonLat(a.lng, a.lat),
          to: projectLonLat(b.lng, b.lat),
        }];
      })
    : [];

  const active = (vehicles ?? []).filter((v: VehicleType) => v.active);
  // Sayı, çipe basmadan önce sonucu söylüyor. Sıfırsa çip bağlantı değil: boş sayfaya
  // götüren bir düğme, kullanıcıya ürünün çalışmadığını düşündürüyor.
  const countOf = (code: string) => (all ?? []).filter((l) => l.vehicleTypeCode === code).length;

  return (
    <>
      <Header />
      <main className="theme-cream min-h-screen bg-bg text-ink">
        <div className="mx-auto max-w-[76rem] px-6 py-12 md:py-16">
          <p className="label-mono text-[var(--route-deep)]">Şu an yolda</p>
          <h1 className="mt-3 text-[clamp(1.9rem,4.5vw,2.9rem)] leading-[1.06]">
            Teklif bekleyen yükler.
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Adres, fotoğraf ve kişi bilgisi burada yok — onları teklif veren onaylı araç
            sahibi görüyor. Burada gördüğün, işin nereden nereye gittiği ve ne kadar büyük
            olduğu.
          </p>

          {cityName && (
            <p className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-11 items-center rounded-field border border-[var(--route-deep)] bg-[var(--route-soft)] px-4 text-sm font-bold">
                {cityName} çıkışlı
              </span>
              <Link href={vehicleFilter ? `/ilanlar?arac=${vehicleFilter}` : '/ilanlar'}
                className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 transition hover:text-[var(--route-deep)]">
                Süzgeci kaldır
              </Link>
            </p>
          )}

          {active.length > 0 && (
            <nav aria-label="Araç tipine göre süz" className="mt-8 flex flex-wrap gap-2">
              <FilterChip
                href={withCity('/ilanlar', cityFilter)}
                label="Tümü"
                count={(all ?? []).length}
                selected={!vehicleFilter}
              />
              {active.map((v: VehicleType) => (
                <FilterChip
                  key={v.code}
                  href={withCity(`/ilanlar?arac=${v.code}`, cityFilter)}
                  label={v.displayName}
                  count={countOf(v.code)}
                  selected={vehicleFilter === v.code}
                />
              ))}
            </nav>
          )}

          {/* Harita boş durumun üstünde: seçilen ilde ilan yoksa kullanıcı
              haritadan başka bir ile geçebilmeli. Altında aynı seçimin klavye
              karşılığı duruyor — seksen bir yolu sekmeye açmak klavye
              kullanıcısını haritanın içinde kilitlerdi. */}
          <div className="mt-8">
            <ProvinceMap
              provinces={provinceStats}
              selectedCityCode={cityFilter || null}
              vehicleFilter={vehicleFilter}
              basePath="/ilanlar"
              routes={ilIciRotalar}
              districts={districtsOf(cityName)}
            />
            <ProvinceList
              provinces={provinceStats}
              selectedCityCode={cityFilter || null}
              vehicleFilter={vehicleFilter}
              basePath="/ilanlar"
            />
          </div>

          {!listings || listings.length === 0 ? (
            <div className="mt-10 rounded-card border border-dashed border-line p-8 text-center">
              <p className="font-semibold">
                {vehicleFilter || cityName ? 'Bu süzgeçle açık ilan yok.' : 'Şu an açık ilan yok.'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {vehicleFilter || cityName ? (
                  <Link href="/ilanlar" className="font-semibold underline underline-offset-4">
                    Tüm ilanlara bak
                  </Link>
                ) : (
                  'Yeni ilanlar gün içinde düşüyor; birazdan tekrar bak.'
                )}
              </p>
            </div>
          ) : (
            <>
              <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {listings.map((l) => (
                  <li
                    key={l.id}
                    id={`ilan-${l.id}`}
                    // Haritadan gelen bağlantı kartı yapışkan başlığın altına sokmasın
                    className="scroll-mt-24 flex flex-col rounded-card border border-line bg-surface p-5"
                  >
                    <p className="flex items-start gap-2 font-bold">
                      <span aria-hidden className="mt-0.5 shrink-0 text-[var(--route-deep)]">
                        <Icon name="route" size={20} />
                      </span>
                      <span className="min-w-0">
                        {l.fromCity}, {l.fromDistrict}
                        <span className="text-muted"> → </span>
                        {l.toCity}, {l.toDistrict}
                      </span>
                    </p>

                    <p className="label-mono mt-3 text-muted">
                      {vehicleName(active, l.vehicleTypeCode)} · {l.distanceKm} km ·{' '}
                      {l.pieceCount} parça
                      {l.volumeM3 > 0 && ` · ${l.volumeM3.toLocaleString('tr-TR')} m³`}
                    </p>

                    <p className="mt-3 text-sm text-muted">
                      tarife tahmini{' '}
                      <span className="stat text-ink">{formatPrice(String(l.estimatedAmount))}</span>
                    </p>

                    <p className="label-mono mt-1 text-muted">
                      {l.offerCount} teklif · {shortDateTime(l.expiresAt)} tarihine kadar açık
                    </p>

                    <Link
                      href={detailHref(l.id)}
                      className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-field border border-line px-4 text-sm font-semibold transition hover:border-route hover:bg-surface-2"
                    >
                      {signedInDriver ? 'Yükü gör ve teklif ver' : 'Teklif vermek için araç sahibi ol'}
                      <Icon name="arrowRight" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>

              {!signedInDriver && (
                <div className="mt-10 rounded-card border border-line bg-surface p-6 md:p-8">
                  <h2 className="text-lg font-bold">Bu yükleri taşımak istiyorsan</h2>
                  <p className="mt-2 max-w-xl text-sm text-muted">
                    Araç sahibi başvurusu onaylandığında yükün fotoğrafını, kalem listesini,
                    kat ve asansör bilgisini görür ve teklif verebilirsin. Belgeler yüklenip
                    onaylanana kadar teklif açılmıyor.
                  </p>
                  <Link
                    href="/sofor-ol"
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-field bg-route px-5 text-sm font-bold text-[var(--route-ink)] transition hover:bg-[var(--route-hover)] active:translate-y-px"
                  >
                    Araç sahibi ol
                    <Icon name="arrowRight" size={16} />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function FilterChip({
  href, label, count, selected,
}: {
  href: string;
  label: string;
  count: number;
  selected: boolean;
}) {
  const inner = (
    <>
      {label}
      <span className={`ml-2 tabular-nums ${selected ? 'text-ink/60' : 'text-muted'}`}>{count}</span>
    </>
  );
  const base = 'inline-flex min-h-11 items-center rounded-field border px-4 text-sm font-semibold transition';

  // Boş süzgeç tıklanabilir değil: basılınca "bu araç tipinde ilan yok" diyen bir
  // sayfaya götürmek, cevabı zaten çipin üzerinde yazarken gereksiz bir tur attırmak
  if (count === 0) {
    return (
      <span aria-disabled="true" className={`${base} border-dashed border-line text-muted opacity-55`}>
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={selected ? 'true' : undefined}
      className={[
        base,
        selected
          ? 'border-[var(--route-deep)] bg-[var(--route-soft)] text-ink'
          : 'border-line text-muted hover:border-muted hover:text-ink',
      ].join(' ')}
    >
      {inner}
    </Link>
  );
}

/** Araç süzgeci değişirken il süzgeci düşmesin; ikisi birlikte çalışıyor. */
function withCity(href: string, cityCode: string): string {
  if (!cityCode) return href;
  return `${href}${href.includes('?') ? '&' : '?'}il=${cityCode}`;
}

/** Katalogda karşılığı yoksa kodun kendisi — boş bırakmaktan iyi. */
function vehicleName(vehicles: VehicleType[], code: string): string {
  return vehicles.find((v) => v.code === code)?.displayName ?? code;
}

function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}
