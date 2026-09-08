import Link from 'next/link';

/**
 * Hukuki metinlerin çizicisi.
 *
 * <p>Markdown kütüphanesi eklenmedi: kullanılan alt küme başlık, paragraf, liste,
 * kalın ve bağlantıdan ibaret ve metinleri biz yazıyoruz. Bir ayrıştırıcı paketi
 * taşımak, bu kadarı için gereksiz ağırlık (docs/03 bağımlılık ölçütü).
 *
 * <p>Çıktı React öğesi; hiçbir yerde {@code dangerouslySetInnerHTML} yok. Metin
 * depodan geliyor ve güvenilir, ama HTML'e dönüştürmemek bu güveni varsayım
 * olmaktan çıkarıyor.
 */
export function LegalProse({ body }: { body: string }) {
  return <div className="legal-prose">{blocks(body)}</div>;
}

function blocks(body: string) {
  const out: React.ReactNode[] = [];
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      out.push(<h3 key={key++} className="mt-8 text-base font-bold">{inline(line.slice(4))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      out.push(<h2 key={key++} className="mt-10 text-lg font-bold md:text-xl">{inline(line.slice(3))}</h2>);
      i++;
      continue;
    }
    if (line.trim() === '---') {
      out.push(<hr key={key++} className="mt-8 border-line" />);
      i++;
      continue;
    }

    // Sırasız liste
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) items.push(lines[i++].slice(2));
      out.push(
        <ul key={key++} className="mt-4 space-y-1.5 pl-5 [&>li]:list-disc">
          {items.map((item, n) => <li key={n} className="leading-relaxed">{inline(item)}</li>)}
        </ul>,
      );
      continue;
    }

    // Sıralı liste — numarayı metin veriyor, tarayıcı yeniden numaralandırmasın
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ''));
      out.push(
        <ol key={key++} className="mt-4 space-y-1.5 pl-5 [&>li]:list-decimal">
          {items.map((item, n) => <li key={n} className="leading-relaxed">{inline(item)}</li>)}
        </ol>,
      );
      continue;
    }

    // Paragraf: boş satıra kadar
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) paragraph.push(lines[i++]);
    out.push(
      <p key={key++} className="mt-4 leading-relaxed">{inline(paragraph.join(' '))}</p>,
    );
  }

  return out;
}

function isBlockStart(line: string) {
  return line.startsWith('## ') || line.startsWith('### ') || line.startsWith('- ')
      || /^\d+\. /.test(line) || line.trim() === '---';
}

/** Kalın, bağlantı ve doldurulmamış yer tutucu. */
function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|(\{\{[A-Z_]+\}\})/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));

    if (match[1]) {
      out.push(<strong key={key++} className="font-bold">{match[1]}</strong>);
    } else if (match[2] && match[3]) {
      const href = match[3];
      out.push(
        href.startsWith('/')
          ? <Link key={key++} href={href} className="font-semibold underline underline-offset-4">{match[2]}</Link>
          : <a key={key++} href={href} className="font-semibold underline underline-offset-4">{match[2]}</a>,
      );
    } else if (match[4]) {
      // Doldurulmamış şirket bilgisi: göze batsın ki yayın öncesi kontrolde yakalansın
      out.push(
        <span key={key++} title="Şirket bilgisi henüz girilmedi"
          className="rounded bg-[#fff3cd] px-1 font-mono text-[0.9em] text-[#6b5300]">
          {match[4]}
        </span>,
      );
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
