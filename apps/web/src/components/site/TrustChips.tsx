const CHIPS = [
  {
    label: 'Belgeleri doğrulanmış şoför',
    icon: <path d="M4 8.5 7 11.5 12.5 4.5" />,
  },
  {
    label: 'Yük sigortası opsiyonu',
    icon: <path d="M8 1.8 13.5 4v4.2c0 3-2.3 5.3-5.5 6.2C4.8 13.5 2.5 11.2 2.5 8.2V4z" />,
  },
  {
    label: 'Canlı konum takibi',
    icon: (
      <>
        <circle cx="8" cy="8" r="6.2" />
        <path d="M8 4.5V8l2.4 1.6" />
      </>
    ),
  },
];

export function TrustChips() {
  return (
    <ul className="mt-7 flex flex-wrap gap-2.5">
      {CHIPS.map((chip) => (
        <li
          key={chip.label}
          className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm"
        >
          <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="var(--amber)"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {chip.icon}
          </svg>
          {chip.label}
        </li>
      ))}
    </ul>
  );
}
