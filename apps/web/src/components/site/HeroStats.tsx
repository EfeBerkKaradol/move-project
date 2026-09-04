/**
 * Tasarımın imzası: köşeli parantez içinde monospace sayılar.
 *
 * <p>Değerler şimdilik yer tutucu — gerçek sayılar canlı sistemden gelecek.
 * Uydurma bir rakamı gerçekmiş gibi göstermemek için `placeholder` işaretli
 * olanlar soluk ve tire ile gösteriliyor.
 */
const STATS: { value: string; label: string; placeholder?: boolean }[] = [
  { value: '—', label: 'Açık yük ilanı', placeholder: true },
  { value: '—', label: 'Doğrulanmış araç', placeholder: true },
  { value: '—', label: 'Ort. ilk teklif', placeholder: true },
];

export function HeroStats() {
  return (
    <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-5 border-t border-line pt-7">
      {STATS.map((s) => (
        <div key={s.label}>
          <dd className={`stat text-3xl ${s.placeholder ? 'text-muted' : 'text-ink'}`}>
            [{s.value}]
          </dd>
          <dt className="label-mono mt-1 text-muted">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}
