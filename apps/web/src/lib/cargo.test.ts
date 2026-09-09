import { describe, expect, it } from 'vitest';
import { decodeItems, declaredItems, encodeItems } from './cargo';

/**
 * Beyan, fiyat adımından ilan adımına URL ile taşınıyor. Bu çeviri bozulursa
 * kullanıcı yükünü iki kez seçer ya da — daha kötüsü — ilan eksik beyanla açılır
 * ve araç sahibi yanlış araçla gelir.
 */

const koli = { defaultPackageItemCode: 'KOLI_STANDART' };

describe('declaredItems', () => {
  it('seçilen kalemleri satıra çeviriyor', () => {
    expect(
      declaredItems(null, { itemQuantities: { KOLTUK_3LU: 1, YATAK_CIFT: 2 }, packageCount: 0 }),
    ).toEqual({ KOLTUK_3LU: 1, YATAK_CIFT: 2 });
  });

  it('paket sayacını kategorinin kalem koduna çeviriyor', () => {
    expect(declaredItems(koli, { itemQuantities: {}, packageCount: 20 })).toEqual({
      KOLI_STANDART: 20,
    });
  });

  it('aynı kalem hem seçilmiş hem sayılmışsa adetleri topluyor', () => {
    // İlanda "3 koli" ve "20 koli" diye iki satır görünmemeli
    expect(
      declaredItems(koli, { itemQuantities: { KOLI_STANDART: 3 }, packageCount: 20 }),
    ).toEqual({ KOLI_STANDART: 23 });
  });

  it('sıfır adetli kalemleri atıyor', () => {
    expect(
      declaredItems(null, { itemQuantities: { KOLTUK_3LU: 0, YATAK_CIFT: 1 }, packageCount: 0 }),
    ).toEqual({ YATAK_CIFT: 1 });
  });

  it('kategorinin paket kalemi yoksa sayacı yok sayıyor', () => {
    // Uydurulmuş bir kod göndermek sunucuda "eşya kodu tanınmadı" ile dönerdi
    expect(
      declaredItems({ defaultPackageItemCode: null }, { itemQuantities: {}, packageCount: 5 }),
    ).toEqual({});
  });

  it('hiçbir şey seçilmemişse boş dönüyor', () => {
    expect(declaredItems(koli, { itemQuantities: {}, packageCount: 0 })).toEqual({});
  });
});

describe('encodeItems / decodeItems', () => {
  it('gidip geri geliyor', () => {
    const lines = { KOLI_STANDART: 20, KOLTUK_L: 1 };
    expect(decodeItems(encodeItems(lines))).toEqual(lines);
  });

  it('boş beyanı boş katara çeviriyor', () => {
    expect(encodeItems({})).toBe('');
    expect(decodeItems('')).toEqual({});
  });

  it('tanınmayan kodu eliyor', () => {
    // Adres çubuğu elle yazılabiliyor; katalogda olmayan kod sunucuya gitmesin
    expect(decodeItems('KOLI_STANDART:2,UYDURMA:5', new Set(['KOLI_STANDART']))).toEqual({
      KOLI_STANDART: 2,
    });
  });

  it('bozuk adetleri eliyor, formu kilitlemiyor', () => {
    expect(decodeItems('KOLI_STANDART:abc,KOLTUK_L:2')).toEqual({ KOLTUK_L: 2 });
    expect(decodeItems('KOLI_STANDART:0')).toEqual({});
    expect(decodeItems('KOLI_STANDART:-3')).toEqual({});
    expect(decodeItems('KOLI_STANDART:1.5')).toEqual({});
  });

  it('mantıksız büyük adedi eliyor', () => {
    // Tek ilanda 5000 koli yok; sunucuya gitmeden burada duruyor
    expect(decodeItems('KOLI_STANDART:5000')).toEqual({});
  });

  it('eksik parçalarda çökmüyor', () => {
    expect(decodeItems(',,KOLI_STANDART:2,:,BOS:')).toEqual({ KOLI_STANDART: 2 });
  });
});
