import { Reveal } from './Reveal';

/**
 * Güven panosunun (docs/09) yerleşimi. Henüz gerçek taşıma olmadığı için
 * içerik <strong>örnek</strong> olarak işaretli — uydurma yorumları gerçekmiş
 * gibi göstermek, panonun var oluş amacının tam tersi olurdu.
 */
const SAMPLE_ROWS = [
  { from: 'Kadıköy', to: 'Beşiktaş', vehicle: 'Transporter', category: 'Tek büyük eşya', km: '9,2' },
  { from: 'Çankaya', to: 'Keçiören', vehicle: 'Doblo', category: 'Koli & orta paket', km: '7,4' },
  { from: 'Antakya', to: 'İskenderun', vehicle: 'Kamyonet', category: 'Ev dolusu eşya', km: '58,1' },
];

export function TrustBoardPreview() {
  return (
    <section id="pano" className="border-b border-line py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Güven panosu
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            Her taşıma ve her değerlendirme herkese açık
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            Yeni bir platforma eşya teslim etmek güven ister. Tamamlanan taşımaları ve
            puanları — düşük puanlar dâhil — açıkça yayınlıyoruz. Rota ilçe düzeyinde
            gösterilir, adres ve tutar asla yayınlanmaz.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-8">
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-2 px-5 py-3">
              <span className="rounded-full bg-signal-soft px-2.5 py-1 text-xs font-semibold text-signal">
                Örnek görünüm
              </span>
              <p className="text-sm text-ink-muted">
                Gerçek veriler ilk taşımalarla dolacak. Aşağıdaki satırlar yerleşimi göstermek
                içindir.
              </p>
            </div>

            <ul className="divide-y divide-line">
              {SAMPLE_ROWS.map((row) => (
                <li key={row.from} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                  <span className="font-display font-bold">
                    {row.from} <span className="text-ink-muted">→</span> {row.to}
                  </span>
                  <span className="text-sm text-ink-muted">
                    {row.vehicle} · {row.category} · {row.km} km
                  </span>
                  <span className="ml-auto text-sm text-ink-muted" aria-hidden>
                    ☆☆☆☆☆
                  </span>
                </li>
              ))}
            </ul>

            <div className="grid gap-px border-t border-line bg-line sm:grid-cols-4">
              {[
                ['—', 'Şu an yolda'],
                ['—', 'Bugün tamamlanan'],
                ['—', 'Ortalama puan'],
                ['—', 'Ortalama eşleşme'],
              ].map(([value, label]) => (
                <div key={label} className="bg-surface px-5 py-4">
                  <p className="font-display text-2xl font-bold tabular-nums text-ink-muted">
                    {value}
                  </p>
                  <p className="text-xs text-ink-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
