import Link from 'next/link';
import { CITIES, formatVolume } from '@turmove/shared';
import { getCargoCategories, getVehicleTypes } from '@/lib/api';

export default async function HomePage() {
  const [categories, vehicles] = await Promise.all([getCargoCategories(), getVehicleTypes()]);
  const apiDown = categories === null || vehicles === null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
        Komisyonsuz dönem · 2027 ilk çeyreğine kadar
      </p>

      <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        Ne taşıyacağını söyle,
        <br />
        aracı biz bulalım
      </h1>

      <p className="mt-5 max-w-xl text-lg text-ink-muted">
        Sipariş öncesi net fiyat, taşıma boyunca canlı takip, istersen nakliyeciyle pazarlık.
        Şu an {CITIES.map((c) => c.name).join(', ')}.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/fiyat-hesapla"
          className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-fg"
        >
          Fiyat hesapla
        </Link>
        <Link
          href="/fiyat-hesapla"
          className="rounded-xl border border-line px-6 py-3 font-medium"
        >
          Nasıl çalışır?
        </Link>
      </div>

      {apiDown ? (
        <p className="mt-16 rounded-xl border border-line bg-surface p-6 text-sm text-ink-muted">
          Katalog yüklenemedi. API çalışmıyor olabilir — <code>pnpm infra:up</code> ve{' '}
          <code>pnpm api</code> ile ayağa kaldırabilirsin.
        </p>
      ) : (
        <>
          <section className="mt-16">
            <h2 className="text-xl font-semibold">Ne taşımak istiyorsunuz?</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <article
                  key={c.code}
                  className="rounded-card border border-line bg-surface p-5"
                >
                  <h3 className="font-semibold">{c.displayName}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{c.scaleHint}</p>
                  {c.typicalVolumeMaxM3 !== null && (
                    <p className="mt-3 text-xs tabular-nums text-ink-muted">
                      {formatVolume(c.typicalVolumeMinM3 ?? 0)} –{' '}
                      {formatVolume(c.typicalVolumeMaxM3)}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-xl font-semibold">Araç filosu</h2>
            <div className="mt-5 overflow-x-auto rounded-card border border-line bg-surface">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-ink-muted">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3">Araç</th>
                    <th className="px-5 py-3">Hacim</th>
                    <th className="px-5 py-3">Kapasite</th>
                    <th className="px-5 py-3">Kasa boyu</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.code} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 font-medium">{v.displayName}</td>
                      <td className="px-5 py-3 tabular-nums">{formatVolume(v.volumeM3)}</td>
                      <td className="px-5 py-3 tabular-nums">
                        {v.payloadKg.toLocaleString('tr-TR')} kg
                      </td>
                      <td className="px-5 py-3 tabular-nums">
                        {v.innerLengthCm.toLocaleString('tr-TR')} cm
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
