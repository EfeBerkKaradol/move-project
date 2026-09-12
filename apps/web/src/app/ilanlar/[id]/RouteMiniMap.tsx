import type { District } from '@tasiyoruz/contracts';
import { MAP_BOX, TURKEY_PATH, projectLonLat } from '@/components/hero/geo-data';
import { normalize } from '@/lib/places';
import { PROVINCE_SHAPES } from '@/components/map/province-shapes';

/**
 * Kadrajın en dar hâli (harita birimi).
 *
 * <p>Rotaya birebir oturtmak il içi taşımada işe yaramıyordu: dört kilometrelik
 * bir rota ülkeyi 200 kat büyütüyor ve arkadaki silüet tanınmaz bir lekeye
 * dönüyor. Bu taban, Marmara büyüklüğünde bir çevre bırakıyor — kullanıcı rotayı
 * bir yere oturtabiliyor.
 */
const EN_DAR = 230;

/** Rotanın çevresinde bırakılan pay, rotanın kendi boyuna oranla. */
const PAY = 0.55;

/**
 * İlanın rotası, ülke siluetinin üstünde.
 *
 * <p>Etkileşim yok ve olmamalı: panodaki büyük harita gezinmek için, bu ise tek
 * bir soruya cevap veriyor — "bu iş nereden nereye?". Sunucuda çiziliyor, bir
 * kilobayt istemci kodu getirmiyor.
 *
 * <p>Kadraj rotaya göre değişiyor: şehirlerarası bir iş ülkeyi, il içi bir iş
 * kendi çevresini gösteriyor. Tek sabit kadraj ikisinden birini hep bozuyordu.
 *
 * <p>Koordinat katalogdan geliyor ve eksik olabiliyor (ilçe kaydı bulunamazsa).
 * O durumda harita hiç çizilmiyor: yanlış yere çizilmiş bir rota, hiç
 * çizilmemiş olandan kötü.
 */
export function RouteMiniMap({ from, to }: { from: District | null; to: District | null }) {
  if (!from || !to) return null;

  const a = projectLonLat(from.lng, from.lat);
  const b = projectLonLat(to.lng, to.lat);

  // Aynı il iki kez çizilmesin (il içi taşımada ikisi de aynı il)
  const adlar = [...new Set([from.cityName, to.cityName].map(normalize))];
  const iller = PROVINCE_SHAPES.filter((s) => adlar.includes(normalize(s.name)));

  // Rotayı çevreleyen kutu, payıyla birlikte; en az EN_DAR genişliğinde
  const genislik = Math.max(Math.abs(b.x - a.x) * (1 + PAY * 2), EN_DAR);
  const oran = MAP_BOX.h / MAP_BOX.w;
  const yukseklik = Math.max(Math.abs(b.y - a.y) * (1 + PAY * 2), genislik * oran);
  const w = Math.min(Math.max(genislik, yukseklik / oran), MAP_BOX.w);
  const h = w * oran;

  // Kadrajı ülkenin içinde tut: rota kenardaysa boş alana bakmak yerine kayıyor
  const x = Math.min(Math.max((a.x + b.x) / 2 - w / 2, 0), MAP_BOX.w - w);
  const y = Math.min(Math.max((a.y + b.y) / 2 - h / 2, 0), MAP_BOX.h - h);

  /*
   * Çizgi kalınlığı ve nokta yarıçapı kadraja göre küçülüyor. viewBox daraldıkça
   * her birim daha çok piksele karşılık geliyor; sabit bırakılsaydı il içi
   * görünümde iki nokta haritanın yarısını kaplardı.
   */
  const k = w / MAP_BOX.w;

  return (
    <figure className="mt-8 overflow-hidden rounded-card border border-line bg-surface">
      <svg
        viewBox={`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`}
        className="block w-full"
        role="img"
        aria-label={`${from.name} ile ${to.name} arasındaki rota`}
      >
        {/*
          Ülke silüeti ülke ölçeği için sadeleştirilmiş (620 nokta); il içi bir
          rotaya yakınlaşınca kıyı çizgisi tanınmaz hâle geliyordu. İlgili iller
          kendi — daha ince — poligonlarıyla üstüne çiziliyor: hem kenar keskin
          kalıyor hem de rotanın hangi ilde geçtiği görünüyor.
        */}
        <path d={TURKEY_PATH} fill="var(--ink)" fillOpacity={0.08} />
        {iller.map((il) => (
          <path
            key={il.name}
            d={il.d}
            fill="var(--route)"
            fillOpacity={0.5}
            stroke="var(--surface)"
            strokeWidth={1}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path
          d={`M${a.x} ${a.y}Q${((a.x + b.x) / 2 + (b.y - a.y) * 0.16).toFixed(1)} ${((a.y + b.y) / 2 - (b.x - a.x) * 0.16).toFixed(1)} ${b.x} ${b.y}`}
          fill="none"
          stroke="var(--route-deep)"
          strokeWidth={2.4 * k}
          strokeLinecap="round"
        />
        <circle cx={a.x} cy={a.y} r={7 * k} fill="var(--route-deep)" />
        <circle
          cx={b.x}
          cy={b.y}
          r={7 * k}
          fill="var(--surface)"
          stroke="var(--route-deep)"
          strokeWidth={2.6 * k}
        />
      </svg>
    </figure>
  );
}
