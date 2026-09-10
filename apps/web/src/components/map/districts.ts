import { normalize } from '@/lib/places';
import { DISTRICTS_BY_PROVINCE, type DistrictShape } from './district-shapes';

/**
 * Bir ilin ilçe sınırları.
 *
 * <p><strong>Yalnızca sunucudan çağrılmalı.</strong> Üretilmiş veri 973 ilçe ve
 * ~366 KB; bir istemci bileşeni bunu içe aktarırsa her ziyaretçi seksen bir ilin
 * tamamını indirir. Sayfa yalnızca <em>seçili</em> ilin ilçelerini yolluyor —
 * en büyük il bile 40 KB'ın altında.
 *
 * <p>Ad normalize ediliyor: kaynak "Hakkâri" diyor, veritabanı "Hakkari".
 */
export function districtsOf(provinceName: string | null | undefined): DistrictShape[] {
  if (!provinceName) return [];
  const aranan = normalize(provinceName);
  for (const [il, ilceler] of Object.entries(DISTRICTS_BY_PROVINCE)) {
    if (normalize(il) === aranan) return ilceler;
  }
  return [];
}

export type { DistrictShape };
