# Hero görselleri

## `truck.webp`

Hero sahnesindeki araç. Beklenen:

- **Biçim:** WebP (ya da AVIF), saydam arka plan
- **Görünüm:** yan profil, hafif üç çeyrek açı; sağa doğru giden bir TIR
- **Genişlik:** 1200–1600 px yeterli (sahnede en fazla ~520 px görünüyor)
- **Işık:** yumuşak, tek yönlü; altında ayrı bir gölge katmanı olmasın —
  sahne gölgeyi kendi ekliyor

Dosya yoksa `TruckAsset` çizgisel bir siluete düşer; site bozulmaz ama nihai
görünüm bu değildir. Yol tek yerde tanımlı: `src/lib/brand.ts` → `TRUCK_ASSET`.
