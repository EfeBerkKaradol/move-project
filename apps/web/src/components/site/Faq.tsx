'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from './Reveal';

type Soru = { q: string; a: React.ReactNode };

/**
 * Yük veren ve araç sahibi aynı soruları sormuyor: biri "eşyam güvende mi",
 * diğeri "param ne zaman elime geçiyor" diye soruyor. Tek listede birleştirmek
 * ikisine de yarısı ilgisiz bir metin okutuyordu.
 */
const SORULAR: Record<'sipper' | 'carrier', Soru[]> = {
  sipper: [
    {
      q: 'Karınca nedir?',
      a: 'Yükü olanla aracı olanı buluşturan bir platform. Taşımayı Karınca yapmıyor; taşımayı üstlenen araç sahibi yapıyor. Karınca ilanı oluşturmanı, teklifleri karşılaştırmanı ve işi takip etmeni sağlıyor.',
    },
    {
      q: 'Fiyat görmek için üye olmam gerekiyor mu?',
      a: 'Hayır. Nereden, nereye ve araç tipini seç, tahmini fiyatı kayıt olmadan gör. Üyelik ancak ilan yayınlarken gerekiyor.',
    },
    {
      q: 'Fiyat nasıl belirleniyor?',
      a: 'Önce tarifeye göre bir tahmin gösteriliyor: taban ücret, mesafe, süre, kat ve asansör durumu, seçtiğin ek hizmetler. Bu bir tahmin — kesin fiyatı araç sahipleri teklif olarak veriyor ve sen seçiyorsun.',
    },
    {
      q: 'Ödemeyi ne zaman yapıyorum?',
      a: 'Teslimatta ve doğrudan taşımayı yapan araç sahibine. Önden ödeme alınmıyor.',
    },
    {
      q: 'Yükümü kim taşıyacak, nasıl seçiyorum?',
      a: 'İlanını yayınladıktan sonra doğrulanmış araç sahipleri teklif veriyor. Teklifleri fiyat, puan ve tamamlanmış iş sayısıyla yan yana görüp birini seçiyorsun. Pazarlık turu yok; herkes tek teklif veriyor.',
    },
    {
      q: 'Eşyamın fotoğrafını neden istiyorsunuz?',
      a: 'Teklifin isabetli olması için. "İki koltuk" yazan bir ilana gelen araç sahibi, koltuğun kapıdan çıkmadığını yerinde öğreniyordu. Fotoğraflar herkese açık sayfalarda yayımlanmıyor; yalnızca teklif verebilecek doğrulanmış araç sahipleri görüyor.',
    },
    {
      q: 'Adresim ve telefonum kime görünüyor?',
      a: (
        <>
          Açık ilanlar sayfasında yalnızca il ve ilçe görünüyor. Tam adres ve iletişim
          bilgin, yalnızca işi üstlenen araç sahibine açılıyor. Ayrıntı için{' '}
          <Link href="/legal/gizlilik" className="font-semibold underline underline-offset-4">
            Gizlilik Politikası
          </Link>
          .
        </>
      ),
    },
    {
      q: 'Karınca benim eşyamı kontrol etmiyor mu?',
      a: (
        <>
          Karınca, kullanıcı beyanına dayalı bir işlem akışı sunuyor; paketleri açıp
          içine bakmıyor. Taşınmasını istediğin eşyanın hukuka uygun olması senin
          sorumluluğunda ve her ilanda bunu ayrıca beyan ediyorsun. Şüpheli ya da
          yasaklı bir kullanım tespit edildiğinde Karınca işlemi inceleyebilir,
          durdurabilir veya hesabı kısıtlayabilir. Bkz.{' '}
          <Link href="/legal/yasakli-esyalar" className="font-semibold underline underline-offset-4">
            Yasaklı eşyalar
          </Link>
          .
        </>
      ),
    },
    {
      q: 'Taşıma sırasında hasar olursa ne oluyor?',
      a: 'Teslimatta fotoğraf kaydı alınıyor; hasar varsa kare kare kayıtta kalıyor. Talebini teslimattan sonra platform üzerinden iletiyorsun ve bu kayıtlar değerlendirmede kullanılıyor.',
    },
    {
      q: 'İlanımı iptal edebilir miyim?',
      a: (
        <>
          Teklif kabul etmediysen her zaman ücretsiz. Kabul ettikten sonraki koşullar{' '}
          <Link href="/legal/iptal-iade" className="font-semibold underline underline-offset-4">
            İptal ve İade
          </Link>{' '}
          sayfasında.
        </>
      ),
    },
  ],
  carrier: [
    {
      q: 'Nasıl araç sahibi olurum?',
      a: 'Başvuru formunu doldurup belgelerini yüklüyorsun. Başvurun onaylandığında teklif verme yetkin açılıyor. Onaydan önce ilanları görebilir ama teklif veremezsin.',
    },
    {
      q: 'Hangi belgeler isteniyor?',
      a: 'Ruhsat, ehliyet ve araç tipine göre gereken yetki belgeleri. Belgeler doğrulanmadan teklif verilemiyor — bu, yük verenin gördüğü "doğrulanmış" işaretinin karşılığı.',
    },
    {
      q: 'Üyelik ücretli mi, komisyon var mı?',
      a: 'Üyelik ücretsiz. Komisyon satırı tarife dökümünde her zaman açık gösteriliyor; şu an sıfır olduğu dönemde de görünüyor, gizli kesinti yok.',
    },
    {
      q: 'Teklif nasıl veriyorum?',
      a: 'Açık ilanlar listesinden yükü açıyor, fotoğraflarını ve kalem listesini görüyor, tek bir fiyat veriyorsun. Karşı teklif turu yok. Yük veren teklifleri karşılaştırıp seçiyor.',
    },
    {
      q: 'Yükü görmeden teklif vermiş oluyor muyum?',
      a: 'Hayır. Her ilanda yük kalem kalem beyan ediliyor ve en az bir fotoğraf zorunlu. Kat, asansör ve mesafe bilgisi de teklif ekranında görünüyor.',
    },
    {
      q: 'Ödememi ne zaman alırım?',
      a: 'Teslimatta, doğrudan yük verenden. Arada bekleyen bir ödeme süreci yok.',
    },
    {
      q: 'Boş dönüş nedir?',
      a: 'Dönüş rotanı kaydediyorsun; o rotaya düşen ilanlar, rotanı kaç kilometre uzattığıyla birlikte sana getiriliyor. Amaç dönüş yolunun boş gitmemesi.',
    },
    {
      q: 'Şüpheli bir yük görürsem ne yapmalıyım?',
      a: (
        <>
          Taşımayı kabul etmek zorunda değilsin; hukuka aykırı olduğunu düşündüğün bir
          yükü reddetmen aleyhine bir sonuç doğurmuyor. İlan üzerindeki bildirim
          seçeneğini kullanarak inceleme başlatabilirsin. Bkz.{' '}
          <Link href="/legal/ihlaller-ve-sikayetler" className="font-semibold underline underline-offset-4">
            İhlal bildirimi
          </Link>
          .
        </>
      ),
    },
    {
      q: 'İş iptal edilirse ne oluyor?',
      a: 'Yola çıkmadıysan iptal ücretsiz. Alış noktasına hareket ettiysen oluşan masraf için ücret talep edilebiliyor; tekrarlanan geç iptaller yük veren tarafında hesap kısıtlamasına yol açıyor.',
    },
  ],
};

const SEKMELER = [
  { id: 'sipper', label: 'Yük verenler' },
  { id: 'carrier', label: 'Yük taşıyanlar' },
] as const;

/**
 * Sıkça sorulan sorular.
 *
 * <p>Açılır kapanır kısımlar {@code <details>} ile: klavye desteği, ekran okuyucu
 * davranışı ve JavaScript kapalıyken açılabilmesi tarayıcıdan geliyor. Elle
 * yazılmış bir açılır panel bunların üçünü de yeniden üretmek zorunda kalırdı.
 */
export function Faq() {
  const [aktif, setAktif] = useState<'sipper' | 'carrier'>('sipper');

  return (
    <section id="sss" className="theme-cream border-t border-line bg-bg py-14 md:py-20">
      <div className="mx-auto max-w-[52rem] px-6">
        <Reveal>
          <p className="label-mono text-muted">Sıkça sorulanlar</p>
          <h2 className="mt-3 text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.05]">
            Aklına takılanlar.
          </h2>
        </Reveal>

        <div role="tablist" aria-label="Soru grubu" className="mt-8 flex flex-wrap gap-2">
          {SEKMELER.map((sekme) => {
            const secili = aktif === sekme.id;
            return (
              <button
                key={sekme.id}
                type="button"
                role="tab"
                aria-selected={secili}
                aria-controls={`sss-${sekme.id}`}
                onClick={() => setAktif(sekme.id)}
                className={[
                  'inline-flex min-h-11 items-center rounded-field border px-4 text-sm font-semibold transition',
                  secili
                    ? 'border-[var(--route-deep)] bg-[var(--route-soft)] text-ink'
                    : 'border-line text-muted hover:border-muted hover:text-ink',
                ].join(' ')}
              >
                {sekme.label}
              </button>
            );
          })}
        </div>

        <div id={`sss-${aktif}`} role="tabpanel" className="mt-6 border-t border-line">
          {SORULAR[aktif].map((soru) => (
            <details key={soru.q} className="group border-b border-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold transition hover:text-[var(--route-deep)] [&::-webkit-details-marker]:hidden">
                {soru.q}
                {/* Ok açılınca dönüyor; ayrı bir "kapat" işareti aramaya gerek kalmıyor */}
                <span aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-180">
                  <Icon name="arrowDown" size={16} />
                </span>
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-muted">{soru.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted">
          Cevabını bulamadın mı?{' '}
          <Link href="/legal" className="font-semibold underline underline-offset-4">
            Yasal belgeler
          </Link>{' '}
          sayfasında ayrıntılı düzenlemeler var.
        </p>
      </div>
    </section>
  );
}
