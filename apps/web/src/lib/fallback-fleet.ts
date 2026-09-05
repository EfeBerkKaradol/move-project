import type { VehicleType } from '@turmove/contracts';

/**
 * API ulaşılamazken kullanılan araç filosu.
 *
 * <p>Pazarlama sayfası backend'e <strong>bağımlı olmamalı</strong>: API kapalıyken
 * ya da henüz dağıtılmamışken site boş görünürse, ziyaretçi ürünün çalışmadığını
 * düşünür. Filo nadiren değişen referans veri olduğu için burada da tutuluyor.
 *
 * <p>⚠️ Bu liste <code>V5__konvoy_fleet.sql</code> ile aynı kalmalı. Filoyu
 * değiştirirken iki yeri birlikte güncelle; API erişilebilir olduğunda her zaman
 * o kazanır, bu yalnızca yedek.
 */
export const FALLBACK_FLEET: VehicleType[] = [
  {
    code: 'MOTOKURYE',
    displayName: 'Motokurye',
    volumeM3: 0.1,
    payloadKg: 30,
    innerLengthCm: 45,
    exampleLoads: 'Zarf, evrak, küçük koli',
    sortOrder: 1,
    active: true,
  },
  {
    code: 'PANELVAN',
    displayName: 'Panelvan',
    volumeM3: 8,
    payloadKg: 1500,
    innerLengthCm: 330,
    exampleLoads: 'Yaklaşık 15 koli, beyaz eşya',
    sortOrder: 2,
    active: true,
  },
  {
    code: 'KAMYONET',
    displayName: 'Kamyonet',
    volumeM3: 18,
    payloadKg: 3500,
    innerLengthCm: 430,
    exampleLoads: '1+1 ev eşyası, tek daire',
    sortOrder: 3,
    active: true,
  },
  {
    code: 'KAMYON',
    displayName: 'Kamyon',
    volumeM3: 45,
    payloadKg: 10000,
    innerLengthCm: 720,
    exampleLoads: 'Yaklaşık 10 palet, 3+1 ev',
    sortOrder: 4,
    active: true,
  },
  {
    code: 'KIRKAYAK',
    displayName: 'Kırkayak',
    volumeM3: 70,
    payloadKg: 18000,
    innerLengthCm: 1000,
    exampleLoads: 'Yaklaşık 16 palet, komple yük',
    sortOrder: 5,
    active: true,
  },
  {
    code: 'TIR',
    displayName: 'TIR',
    volumeM3: 90,
    payloadKg: 24000,
    innerLengthCm: 1360,
    exampleLoads: 'Komple yük, uluslararası',
    sortOrder: 6,
    active: false,
  },
];
