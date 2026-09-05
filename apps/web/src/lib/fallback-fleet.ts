import type { VehicleType } from '@turmove/contracts';
import type { VehicleTypeCode } from '@turmove/shared';

/**
 * API ulaşılamazken kullanılan araç filosu.
 *
 * <p>Pazarlama sayfası backend'e <strong>bağımlı olmamalı</strong>: API kapalıyken
 * ya da henüz dağıtılmamışken site boş görünürse, ziyaretçi ürünün çalışmadığını
 * düşünür. Filo nadiren değişen referans veri olduğu için burada da tutuluyor.
 *
 * <p>⚠️ Bu liste <code>V7__fleet_revision.sql</code> ile aynı kalmalı. Filoyu
 * değiştirirken iki yeri birlikte güncelle; API erişilebilir olduğunda her zaman
 * o kazanır, bu yalnızca yedek.
 *
 * <p>Kodlar {@link VehicleTypeCode} ile daraltıldı: filo değişip burası unutulursa
 * en azından kaldırılmış bir araç kodu derlemeyi kırar. Ölçülerin migration ile
 * tutarlılığı hâlâ elle korunuyor.
 */
export const FALLBACK_FLEET: (VehicleType & { code: VehicleTypeCode })[] = [
  {
    code: 'MOTOR',
    displayName: 'Motor',
    volumeM3: 0.1,
    payloadKg: 30,
    innerLengthCm: 45,
    exampleLoads: 'Zarf, evrak, küçük koli',
    sortOrder: 1,
    active: true,
  },
  {
    code: 'MINI_PANELVAN',
    displayName: 'Mini panelvan',
    volumeM3: 2.5,
    payloadKg: 600,
    innerLengthCm: 150,
    exampleLoads: '5-6 koli, çamaşır makinesi',
    sortOrder: 2,
    active: true,
  },
  {
    code: 'PANELVAN',
    displayName: 'Panelvan',
    volumeM3: 5,
    payloadKg: 1000,
    innerLengthCm: 250,
    exampleLoads: '10-12 koli, buzdolabı, çift yatak',
    sortOrder: 3,
    active: true,
  },
  {
    code: 'MINIVAN',
    displayName: 'Minivan',
    volumeM3: 8,
    payloadKg: 1300,
    innerLengthCm: 330,
    exampleLoads: 'Oda dolusu eşya, yaklaşık 15 koli',
    sortOrder: 4,
    active: true,
  },
  {
    code: 'KAMYONET',
    displayName: 'Kamyonet',
    volumeM3: 18,
    payloadKg: 3500,
    innerLengthCm: 430,
    exampleLoads: '1+1 ev eşyası, tek daire',
    sortOrder: 5,
    active: true,
  },
  {
    code: 'KAMYON',
    displayName: 'Kamyon',
    volumeM3: 45,
    payloadKg: 10000,
    innerLengthCm: 720,
    exampleLoads: 'Yaklaşık 10 palet, 3+1 ev',
    sortOrder: 6,
    active: true,
  },
  {
    code: 'TIR',
    displayName: 'TIR',
    volumeM3: 90,
    payloadKg: 24000,
    innerLengthCm: 1360,
    exampleLoads: 'Komple yük, uluslararası',
    sortOrder: 7,
    active: false,
  },
];
