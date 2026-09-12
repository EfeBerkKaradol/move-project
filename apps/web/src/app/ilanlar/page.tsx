import type { District, VehicleType } from '@tasiyoruz/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth, isDriver } from '@/auth';
import {
  DistrictList,
  ProvinceList,
  ProvinceMap,
  type DistrictStat,
  type MapRoute,
  type ProvinceStat,
} from '@/components/map/ProvinceMap';
import { districtsOf } from '@/components/map/districts';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { Icon } from '@/components/ui/Icon';
import { CitySelect } from './CitySelect';
import { ListingRows } from './ListingRows';
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
  // İlçe süzgeci ilsiz anlamsız: aynı ilçe adı birden çok ilde geçiyor
  const districtFilter = cityFilter ? first(p.ilce) : '';
  /*
   * İki görünüm, tek sayfa ve tek süzgeç kümesi. Varsayılan LİSTE: "burada ne
   * var?" sorusunu en hızlı o cevaplıyor. Harita, araç sahibinin "bana yakın ne
   * var?" sorusu için ve menüde ayrı bir maddeden (Yük bul) açılıyor.
   * Görünüm URL'de: paylaşılan bağlantı aynı ekranı açıyor.
   */
  const harita = first(p.gorunum) === 'harita';
  // Araç süzgeci sunucuda değil burada uygulanıyor: çiplerin yanındaki sayılar için
  // zaten o ildeki bütün ilanlar gerekiyor ve iki istek atmanın anlamı yok.
  // İki liste: haritanın sayaçları bütün illeri bilmek zorunda, liste ise
  // seçilen ilin ilanlarını sunucudan süzülmüş hâlde istiyor. Süzgeç yokken
  // ikisi aynı istek — haritada gösterilen sayı, listede görülebilecek sayı.
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
  const aracSuzulmus = vehicleFilter
    ? (all ?? []).filter((l) => l.vehicleTypeCode === vehicleFilter)
    : all;
  /*
   * İlçe süzgeci "buradan ÇIKAN yükler" demek, "burada geçen" değil. Araç sahibi
   * bir ilçe seçtiğinde sorduğu şey "yükü nereden alacağım"; teslim ilçesine göre
   * süzmek, o ilçeye gidecek ama bambaşka bir yerden yüklenecek işleri getirirdi.
   */
  const listings = districtFilter
    ? (aracSuzulmus ?? []).filter((l) => normalize(l.fromDistrict) === normalize(districtFilter))
    : aracSuzulmus;

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

  /*
   * Seçili ildeki ilçe başına ilan sayısı — haritada hangi ilçenin tıklanabilir
   * olduğunu bu belirliyor. Araç süzgeci yansıtılıyor, il sayaçlarıyla aynı
   * gerekçe: yansıtılmasaydı boyalı bir ilçeye basıp boş liste bulunurdu.
   *
   * Sayım ALIŞ ilçesine göre: ilçe süzgeci de öyle çalışıyor, ikisi ayrışsaydı
   * haritadaki sayı listedekini tutmazdı.
   */
  const ilinIlanlari = vehicleFilter
    ? (all ?? []).filter((l) => l.vehicleTypeCode === vehicleFilter)
    : (all ?? []);
  const ilceSayisi = new Map<string, { name: string; count: number }>();
  if (cityFilter) {
    for (const l of ilinIlanlari) {
      const a = (districts ?? []).find((d: District) => d.id === l.fromDistrictId);
      if (!a || a.cityCode !== cityFilter) continue;
      const k = normalize(a.name);
      const v = ilceSayisi.get(k);
      if (v) v.count += 1;
      else ilceSayisi.set(k, { name: a.name, count: 1 });
    }
  }
  const districtStats: DistrictStat[] = [...ilceSayisi.values()];

  const districtName = districtFilter
    ? ([...ilceSayisi.values()].find((d) => normalize(d.name) === normalize(districtFilter))?.name ??
      districtFilter)
    : null;

  /*
   * Haritadaki rotalar. İki tür var ve ikisi de seçili ilden ÇIKAN işler:
   *   ic  — teslim de aynı ilde; yayla çiziliyor, ilçe görünümünde okunuyor.
   *   dis — teslim başka bir ilde; hedefi kadrajın dışında kalıyor, kesik
   *         çizgiyle çıkıp kenarda okla bitiyor (bkz. ProvinceMap).
   *
   * Koordinatlar sunucuda projekte ediliyor, istemciye ilçe enlem/boylamı
   * taşınmıyor. Koordinatı bulunamayan ilan çizilmiyor ama listede duruyor —
   * eksik bir katalog kaydı yüzünden iş gizlenmemeli.
   */
  const konum = new Map((districts ?? []).map((d: District) => [d.id, d]));
  const rotalar: MapRoute[] = cityFilter
    ? (listings ?? []).flatMap((l) => {
        const a = konum.get(l.fromDistrictId);
        const b = konum.get(l.toDistrictId);
        if (!a || !b || a.cityCode !== cityFilter) return [];
        const ic = b.cityCode === cityFilter;
        return [{
          id: l.id,
          kind: ic ? ('ic' as const) : ('dis' as const),
          label: ic
            ? `${a.name} → ${b.name} · ${l.vehicleTypeCode}`
            : `${a.name} → ${b.cityName} · ${l.vehicleTypeCode}`,
          from: projectLonLat(a.lng, a.lat),
          to: projectLonLat(b.lng, b.lat),
        }];
      })
    : [];

  /** Süzgeçlerin o anki hâli; bağlantılar bunun üstüne tek alan değiştiriyor. */
  const suzgec = { arac: vehicleFilter, il: cityFilter, ilce: districtFilter, harita };

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
              <Link href={ilanlarHref(suzgec, { il: '', ilce: '' })}
                className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 transition hover:text-[var(--route-deep)]">
                Süzgeci kaldır
              </Link>
            </p>
          )}

          {active.length > 0 && (
            <nav aria-label="Araç tipine göre süz" className="mt-8 flex flex-wrap gap-2">
              <FilterChip
                href={ilanlarHref(suzgec, { arac: '' })}
                label="Tümü"
                count={(all ?? []).length}
                selected={!vehicleFilter}
              />
              {active.map((v: VehicleType) => (
                <FilterChip
                  key={v.code}
                  href={ilanlarHref(suzgec, { arac: v.code })}
                  label={v.displayName}
                  count={countOf(v.code)}
                  selected={vehicleFilter === v.code}
                />
              ))}
            </nav>
          )}

          {/* Görünüm anahtarı: aynı süzgeçler, iki okuma biçimi */}
          <nav aria-label="Görünüm" className="mt-8 inline-flex rounded-field border border-line p-1">
            {([
              { harita: false, label: 'Liste' },
              { harita: true, label: 'Harita' },
            ] as const).map((g) => (
              <Link
                key={g.label}
                href={ilanlarHref(suzgec, { harita: g.harita })}
                aria-current={harita === g.harita ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-[calc(var(--radius-field)-0.25rem)] px-4 text-sm font-semibold transition ${
                  harita === g.harita ? 'bg-route text-[var(--route-ink)]' : 'text-muted hover:text-ink'
                }`}
              >
                {g.label}
              </Link>
            ))}
          </nav>

          {!harita && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <CitySelect
                cities={provinceStats
                  .filter((c) => c.count > 0)
                  .sort((a, b) => a.name.localeCompare(b.name, 'tr'))}
                selected={cityFilter}
                hrefFor={ilanlarHref(suzgec, { il: '__IL__', ilce: '' })}
              />
              {cityFilter && (
                <DistrictList
                  districtStats={districtStats}
                  selectedCityCode={cityFilter}
                  selectedDistrict={districtName}
                  vehicleFilter={vehicleFilter}
                  basePath="/ilanlar"
                />
              )}
            </div>
          )}

          {/* Harita boş durumun üstünde: seçilen ilde ilan yoksa kullanıcı
              haritadan başka bir ile geçebilmeli. Altında aynı seçimin klavye
              karşılığı duruyor — seksen bir yolu sekmeye açmak klavye
              kullanıcısını haritanın içinde kilitlerdi. */}
          {harita && (
          <div className="mt-8">
            <ProvinceMap
              provinces={provinceStats}
              selectedCityCode={cityFilter || null}
              selectedDistrict={districtName}
              vehicleFilter={vehicleFilter}
              basePath="/ilanlar"
              routes={rotalar}
              districts={districtsOf(cityName)}
              districtStats={districtStats}
            />
            <ProvinceList
              provinces={provinceStats}
              selectedCityCode={cityFilter || null}
              vehicleFilter={vehicleFilter}
              basePath="/ilanlar"
            />
            {cityFilter && (
              <DistrictList
                districtStats={districtStats}
                selectedCityCode={cityFilter}
                selectedDistrict={districtName}
                vehicleFilter={vehicleFilter}
                basePath="/ilanlar"
              />
            )}
          </div>
          )}

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
              {/*
                Kartlar üç sütuna yayılıyordu ve ekrana altı ilan sığıyordu; yüz
                yetmiş dokuz ilanı öyle taramak mümkün değil. Satır düzeni hem
                listede hem haritada aynı: iki görünüm arasında geçen kullanıcı
                aynı satırı arıyor.
              */}
              <p className="label-mono mt-6 text-muted">
                {listings.length} ilan
                {cityName && ` · ${cityName}${districtName ? `, ${districtName}` : ''} çıkışlı`}
              </p>
              <ListingRows listings={listings} vehicles={active} />

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
/**
 * Sayfanın bütün süzgeçlerini taşıyan adres.
 *
 * <p>Tek tek birleştirmek (withCity gibi) her yeni süzgeçte bir çağrı yerini
 * unutturuyordu: araç seçiliyken il değiştirince görünüm sıfırlanıyordu. Burada
 * hepsi tek yerde ve verilmeyen alan MEVCUT değeri koruyor.
 */
function ilanlarHref(
  simdi: { arac: string; il: string; ilce: string; harita: boolean },
  degisiklik: Partial<{ arac: string; il: string; ilce: string; harita: boolean }> = {},
): string {
  const v = { ...simdi, ...degisiklik };
  const q = new URLSearchParams();
  if (v.arac) q.set('arac', v.arac);
  if (v.il) q.set('il', v.il);
  // İlçe ilsiz anlamsız: aynı ad birden çok ilde geçiyor
  if (v.il && v.ilce) q.set('ilce', v.ilce);
  if (v.harita) q.set('gorunum', 'harita');
  const s = q.toString();
  return s ? `/ilanlar?${s}` : '/ilanlar';
}


