import type { CorridorMatchView, CorridorView, District, ListingView, VehicleType } from '@tasiyoruz/contracts';
import { CORRIDOR_STATUS_LABELS } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, apiFetch } from '../api';
import { useAuth } from '../auth/AuthContext';
import { BilgiSeridi, BosKart, Buton, HataKarti } from '../components/ui';
import { buyukHarf, colors, fonts, label, radius } from '../theme';
import { CorridorSheet } from './CorridorSheet';
import { OfferSheet } from './OfferSheet';

type Veri = {
  koridorlar: CorridorView[];
  eslesmeler: CorridorMatchView[];
  iller: District[];
  araclar: VehicleType[];
};
type Durum = { tip: 'yukleniyor' } | { tip: 'hazir'; veri: Veri } | { tip: 'hata'; mesaj: string };

/**
 * İl başına tek temsilci ilçe (web'deki provinceChoices ile aynı kural):
 * üç ilde gerçek ilçe verisi var, kalanlarda "Merkez".
 */
export function ilTemsilcileri(ilceler: District[]): District[] {
  const ilBasina = new Map<string, District>();
  for (const d of ilceler) {
    const mevcut = ilBasina.get(d.cityCode);
    if (!mevcut || (d.slug === 'merkez' && mevcut.slug !== 'merkez')) ilBasina.set(d.cityCode, d);
  }
  return [...ilBasina.values()].sort((a, b) => a.cityName.localeCompare(b.cityName, 'tr'));
}

function yer(p: { cityName: string | null; districtName: string | null }): string {
  return [p.cityName, p.districtName].filter(Boolean).join(', ') || 'Belirtilmemiş';
}

function gunSaat(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function onayla(baslik: string, mesaj: string, eylem: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${baslik}\n\n${mesaj}`));
  return new Promise((cozumle) => {
    Alert.alert(baslik, mesaj, [
      { text: 'Vazgeç', style: 'cancel', onPress: () => cozumle(false) },
      { text: eylem, style: 'destructive', onPress: () => cozumle(true) },
    ]);
  });
}

/**
 * Boş dönüş: sürücünün dönüş koridorları ve o koridorlara düşen ilanlar.
 *
 * <p>Sıra web ile aynı — önce eşleşen ilanlar (para orada), sonra koridorlar,
 * en altta yeni koridor. Eşleşen ilana buradan teklif verilebiliyor; ilan
 * listesine geçip aramak, koridorun bütün amacını boşa çıkarırdı.
 */
export function Corridors() {
  const { erisimTokeni } = useAuth();
  const [durum, setDurum] = useState<Durum>({ tip: 'yukleniyor' });
  const [yenileniyor, setYenileniyor] = useState(false);
  const [formAcik, setFormAcik] = useState(false);
  const [teklifIlani, setTeklifIlani] = useState<ListingView | null>(null);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<{ metin: string; hata?: boolean } | null>(null);

  const yukle = useCallback(async () => {
    try {
      const [koridorlar, eslesmeler, ilceler, tipler] = await Promise.all([
        apiFetch<CorridorView[]>('/driver/corridors', erisimTokeni),
        apiFetch<CorridorMatchView[]>('/driver/corridors/matches', erisimTokeni),
        apiFetch<District[]>('/public/districts', erisimTokeni).catch(() => [] as District[]),
        apiFetch<VehicleType[]>('/public/vehicle-types', erisimTokeni).catch(() => [] as VehicleType[]),
      ]);
      setDurum({
        tip: 'hazir',
        veri: { koridorlar, eslesmeler, iller: ilTemsilcileri(ilceler), araclar: tipler.filter((t) => t.active) },
      });
    } catch (e) {
      setDurum({ tip: 'hata', mesaj: e instanceof ApiError ? e.message : 'Sunucuya ulaşılamadı.' });
    }
  }, [erisimTokeni]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const yenile = useCallback(async () => {
    setYenileniyor(true);
    await yukle();
    setYenileniyor(false);
  }, [yukle]);

  /** Sunucuya kısa bir komut gönderip listeyi tazeler; hata şeride düşer. */
  const komut = useCallback(
    async (anahtar: string, yol: string, method: 'POST' | 'DELETE', basari: string, hataMesaji: string) => {
      setMesgul(anahtar);
      setBilgi(null);
      try {
        await apiFetch(yol, erisimTokeni, { method });
        setBilgi({ metin: basari });
        await yukle();
      } catch (e) {
        setBilgi({ metin: e instanceof ApiError ? e.message : hataMesaji, hata: true });
      } finally {
        setMesgul(null);
      }
    },
    [erisimTokeni, yukle],
  );

  if (durum.tip === 'yukleniyor') return <ActivityIndicator color={colors.routeDeep} style={styles.ortaBosluk} />;
  if (durum.tip === 'hata') return <HataKarti mesaj={durum.mesaj} tekrar={yukle} />;

  const { koridorlar, eslesmeler, iller, araclar } = durum.veri;
  const aracAdi = (kod: string) => araclar.find((a) => a.code === kod)?.displayName ?? kod;

  return (
    <>
      <CorridorSheet
        gorunur={formAcik}
        iller={iller}
        araclar={araclar}
        kapat={() => setFormAcik(false)}
        kaydedildi={() => {
          setFormAcik(false);
          setBilgi({ metin: 'Koridor kaydedildi. Rotana düşen ilanlar burada görünecek.' });
          void yukle();
        }}
      />
      <OfferSheet
        ilan={teklifIlani}
        aracAdi={teklifIlani ? aracAdi(teklifIlani.vehicleTypeCode) : ''}
        kapat={() => setTeklifIlani(null)}
        teklifVerildi={() => {
          setTeklifIlani(null);
          setBilgi({ metin: 'Teklifin gönderildi. Yük veren kabul ederse bilgilerin açılacak.' });
          void yukle();
        }}
      />
      <ScrollView
        contentContainerStyle={styles.icerik}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={yenile} tintColor={colors.routeDeep} />}
      >
        <View style={styles.listeBasligi}>
          <Text style={styles.etiket}>{buyukHarf('Boş dönüş')}</Text>
          <Text style={styles.sayi}>
            {eslesmeler.length === 0 ? 'Rotana düşen ilan yok' : `${eslesmeler.length} ilan rotana düşüyor`}
          </Text>
        </View>
        {bilgi && <BilgiSeridi metin={bilgi.metin} hata={bilgi.hata} />}

        {eslesmeler.length === 0 && koridorlar.length === 0 && (
          <BosKart
            baslik="Dönüş rotanı henüz kaydetmedin"
            metin="Yükü bıraktığın şehirden dönerken boş gitme. Rotanı kaydet, o rotaya düşen ilanlar buraya gelsin."
          />
        )}

        {eslesmeler.map((e) => {
          const parca = e.listing.cargoItems.reduce((t, i) => t + i.quantity, 0);
          return (
            <View key={e.id} style={styles.kart}>
              <View style={styles.ustSatir}>
                <Text style={styles.rota} numberOfLines={2}>
                  {yer(e.listing.pickup)} → {yer(e.listing.dropoff)}
                </Text>
                <View style={styles.rozet}>
                  <Text style={styles.rozetYazi}>+{e.detourKm.toFixed(0)} km</Text>
                </View>
              </View>
              <Text style={styles.detay}>
                {aracAdi(e.listing.vehicleTypeCode)}
                {parca > 0 ? ` · ${parca} parça` : ''}
                {' · '}
                {e.listing.offerCount === 0 ? 'ilk teklif senin olabilir' : `${e.listing.offerCount} teklif`}
              </Text>
              <View style={styles.altSatir}>
                <View>
                  <Text style={styles.tutarEtiket}>{buyukHarf('tarife tahmini')}</Text>
                  <Text style={styles.tutar}>{formatPrice(e.listing.estimatedAmount.amount)}</Text>
                </View>
                <View style={styles.eylemler}>
                  <Buton
                    tur="ikincil"
                    onPress={() =>
                      komut(e.id, `/driver/corridors/matches/${e.id}/ignore`, 'POST', 'İlan listeden kaldırıldı.', 'Eşleşme kapatılamadı.')
                    }
                    bekliyor={mesgul === e.id}
                  >
                    İlgilenmiyorum
                  </Buton>
                  <Buton onPress={() => setTeklifIlani(e.listing)}>Teklif ver</Buton>
                </View>
              </View>
            </View>
          );
        })}

        {koridorlar.length > 0 && (
          <>
            <Text style={[styles.etiket, styles.bolumBasligi]}>{buyukHarf('Koridorlarım')}</Text>
            {koridorlar.map((k) => {
              const aktif = k.status === 'ACTIVE';
              return (
                <View key={k.id} style={[styles.kart, k.status !== 'ACTIVE' && styles.kartSonuk]}>
                  <View style={styles.ustSatir}>
                    <Text style={styles.rota} numberOfLines={2}>
                      {k.origin.cityName} → {k.destination.cityName}
                    </Text>
                    <View style={[styles.rozet, aktif && styles.rozetAktif]}>
                      <Text style={[styles.rozetYazi, aktif && styles.rozetYaziAktif]}>
                        {buyukHarf(CORRIDOR_STATUS_LABELS[k.status])}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detay}>
                    {aracAdi(k.vehicleTypeCode)} · en fazla {k.detourToleranceKm} km sapma
                    {k.minAmount ? ` · alt sınır ${formatPrice(k.minAmount.amount)}` : ''}
                  </Text>
                  <Text style={styles.detay}>
                    {gunSaat(k.departureFrom)} – {gunSaat(k.departureTo)}
                    {k.pendingMatchCount > 0 ? ` · ${k.pendingMatchCount} ilan bekliyor` : ''}
                  </Text>
                  <View style={[styles.eylemler, styles.koridorEylemleri]}>
                    <Buton
                      tur="tehlike"
                      onPress={async () => {
                        const evet = await onayla('Koridoru sil', `${k.origin.cityName} → ${k.destination.cityName} koridoru silinecek.`, 'Sil');
                        if (evet) void komut(`sil-${k.id}`, `/driver/corridors/${k.id}`, 'DELETE', 'Koridor silindi.', 'Koridor silinemedi.');
                      }}
                      bekliyor={mesgul === `sil-${k.id}`}
                    >
                      Sil
                    </Buton>
                    {k.status !== 'EXPIRED' && (
                      <Buton
                        tur="ikincil"
                        onPress={() =>
                          komut(
                            k.id,
                            `/driver/corridors/${k.id}/${aktif ? 'pause' : 'resume'}`,
                            'POST',
                            aktif ? 'Koridor duraklatıldı.' : 'Koridor yeniden yayında.',
                            'Koridor güncellenemedi.',
                          )
                        }
                        bekliyor={mesgul === k.id}
                      >
                        {aktif ? 'Duraklat' : 'Sürdür'}
                      </Buton>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <Buton
          onPress={() => setFormAcik(true)}
          disabled={iller.length === 0}
          style={styles.yeni}
          accessibilityLabel="Yeni koridor tanımla"
        >
          Yeni koridor
        </Buton>
        {iller.length === 0 && <Text style={styles.ipucu}>İl listesi şu an yüklenemedi; aşağı çekip yenile.</Text>}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  icerik: { paddingBottom: 40, gap: 12 },
  listeBasligi: { marginTop: 24, marginBottom: 4 },
  etiket: { ...label, color: colors.routeDeep },
  bolumBasligi: { marginTop: 16 },
  sayi: { color: colors.cream.ink, fontFamily: fonts.sansBlack, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, marginTop: 8 },
  ortaBosluk: { marginTop: 40 },
  kart: {
    backgroundColor: colors.cream.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cream.line,
    padding: 16,
  },
  kartSonuk: { backgroundColor: colors.cream.surface2 },
  ustSatir: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rota: { flex: 1, color: colors.cream.ink, fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 22 },
  rozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.cream.surface2, borderWidth: 1, borderColor: colors.cream.line },
  rozetAktif: { backgroundColor: colors.routeSoft, borderColor: colors.routeSoft },
  rozetYazi: { ...label, fontSize: 10, color: colors.cream.ink },
  rozetYaziAktif: { color: colors.routeDeep },
  detay: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, marginTop: 6 },
  altSatir: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14, gap: 12 },
  tutarEtiket: { ...label, color: colors.cream.muted },
  tutar: { color: colors.cream.ink, fontFamily: fonts.monoBold, fontSize: 18, marginTop: 4 },
  eylemler: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  koridorEylemleri: { marginTop: 14 },
  yeni: { marginTop: 8 },
  ipucu: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 12, textAlign: 'center' },
});
