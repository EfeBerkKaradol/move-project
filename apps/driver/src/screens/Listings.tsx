import type { ListingView, OfferView, VehicleType } from '@tasiyoruz/contracts';
import { formatPrice, formatVolume } from '@tasiyoruz/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiError, apiFetch } from '../api';
import { useAuth } from '../auth/AuthContext';
import { buyukHarf, colors, fonts, label, radius, touch } from '../theme';
import { OfferSheet } from './OfferSheet';

type Durum =
  | { tip: 'yukleniyor' }
  | { tip: 'hazir'; ilanlar: ListingView[] }
  | { tip: 'hata'; mesaj: string };

/** Kalan süreyi kabaca yazar; sürücü dakikayı değil "ne kadar acele" bilgisini istiyor. */
function kalanSure(expiresAt: string, simdi = Date.now()): string {
  const fark = new Date(expiresAt).getTime() - simdi;
  if (fark <= 0) return 'süresi doldu';
  const saat = Math.floor(fark / 3_600_000);
  if (saat >= 24) return `${Math.floor(saat / 24)} gün kaldı`;
  if (saat >= 1) return `${saat} saat kaldı`;
  return `${Math.max(1, Math.floor(fark / 60_000))} dk kaldı`;
}

function yer(p: ListingView['pickup']): string {
  return [p.cityName, p.districtName].filter(Boolean).join(', ') || 'Belirtilmemiş';
}

/**
 * Sürücüye açık ilanlar.
 *
 * <p>Adres, fotoğraf ve iletişim bilgisi burada yok — onlar teklif kabul edilince
 * açılıyor (docs/11). Listede işin nereden nereye gittiği, ne kadar büyük olduğu
 * ve tarife tahmini var; sürücünün teklif verip vermeyeceğine karar vermesi için
 * gereken bilgi bu.
 */
export function Listings() {
  const { erisimTokeni } = useAuth();
  const [durum, setDurum] = useState<Durum>({ tip: 'yukleniyor' });
  const [araclar, setAraclar] = useState<Record<string, string>>({});
  const [yenileniyor, setYenileniyor] = useState(false);
  const [secili, setSecili] = useState<ListingView | null>(null);
  // Teklif verilmiş ilanlar; sürücü aynı ilana ikinci kez dokunup 409 almasın.
  const [teklifliler, setTeklifliler] = useState<Set<string>>(new Set());
  const [sonTeklif, setSonTeklif] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      const [ilanlar, tipler, teklifler] = await Promise.all([
        apiFetch<ListingView[]>('/driver/listings/open', erisimTokeni),
        // Araç adları herkese açık uçtan; kod yerine ad göstermek için.
        apiFetch<VehicleType[]>('/public/vehicle-types', erisimTokeni).catch(() => [] as VehicleType[]),
        apiFetch<OfferView[]>('/driver/offers', erisimTokeni).catch(() => [] as OfferView[]),
      ]);
      setAraclar(Object.fromEntries(tipler.map((t) => [t.code, t.displayName])));
      setTeklifliler(
        new Set(teklifler.filter((o) => o.status === 'SUBMITTED').map((o) => o.listingId)),
      );
      setDurum({ tip: 'hazir', ilanlar });
    } catch (e) {
      setDurum({
        tip: 'hata',
        mesaj: e instanceof ApiError ? e.message : 'Sunucuya ulaşılamadı.',
      });
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

  if (durum.tip === 'yukleniyor') {
    return <ActivityIndicator color={colors.routeDeep} style={styles.ortaBosluk} />;
  }

  if (durum.tip === 'hata') {
    return (
      <View style={styles.kart}>
        <Text style={styles.kartBaslik}>Yüklenemedi</Text>
        <Text style={styles.kartMetin}>{durum.mesaj}</Text>
        <Pressable onPress={yukle} style={styles.tekrar} accessibilityRole="button">
          <Text style={styles.tekrarYazi}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      {sonTeklif && (
        <View style={styles.bilgi}>
          <Text style={styles.bilgiYazi}>{sonTeklif}</Text>
        </View>
      )}
      <OfferSheet
        ilan={secili}
        aracAdi={secili ? (araclar[secili.vehicleTypeCode] ?? secili.vehicleTypeCode) : ''}
        kapat={() => setSecili(null)}
        teklifVerildi={() => {
          setSecili(null);
          setSonTeklif('Teklifin gönderildi. Yük veren kabul ederse bilgilerin açılacak.');
          void yukle();
        }}
      />
      <FlatList
      data={durum.ilanlar}
      keyExtractor={(l) => l.id}
      contentContainerStyle={styles.liste}
      refreshControl={
        <RefreshControl refreshing={yenileniyor} onRefresh={yenile} tintColor={colors.routeDeep} />
      }
      ListHeaderComponent={
        <View style={styles.listeBasligi}>
          <Text style={styles.etiket}>{buyukHarf('Açık ilanlar')}</Text>
          <Text style={styles.sayi}>
            {durum.ilanlar.length} yük teklif bekliyor
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.kart}>
          <Text style={styles.kartBaslik}>Şu an açık ilan yok</Text>
          <Text style={styles.kartMetin}>
            Yeni ilanlar gün içinde düşüyor. Aşağı çekerek yenileyebilirsin.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const teklifVerildi = teklifliler.has(item.id);
        const parca = item.cargoItems.reduce((t, i) => t + i.quantity, 0);
        const hacim = item.cargoItems.reduce((t, i) => t + i.volumeM3 * i.quantity, 0);
        return (
          <Pressable
            onPress={() => !teklifVerildi && setSecili(item)}
            disabled={teklifVerildi}
            accessibilityRole="button"
            accessibilityLabel={
              teklifVerildi
                ? `${yer(item.pickup)} - ${yer(item.dropoff)} ilanına teklif verdin`
                : `${yer(item.pickup)} - ${yer(item.dropoff)} ilanına teklif ver`
            }
            style={({ pressed }) => [
              styles.ilan,
              pressed && styles.ilanBasili,
              teklifVerildi && styles.ilanTeklifli,
            ]}
          >
            <View style={styles.rotaSatiri}>
              <Text style={styles.rota} numberOfLines={2}>
                {yer(item.pickup)} → {yer(item.dropoff)}
              </Text>
            </View>

            <Text style={styles.detay}>
              {araclar[item.vehicleTypeCode] ?? item.vehicleTypeCode}
              {parca > 0 ? ` · ${parca} parça` : ''}
              {hacim > 0 ? ` · ${formatVolume(hacim)}` : ''}
            </Text>

            <View style={styles.altSatir}>
              <View>
                <Text style={styles.tarifeEtiket}>{buyukHarf('tarife tahmini')}</Text>
                <Text style={styles.tutar}>{formatPrice(item.estimatedAmount.amount)}</Text>
              </View>
              <View style={styles.sagBilgi}>
                <Text style={[styles.teklif, teklifVerildi && styles.teklifVerildi]}>
                  {teklifVerildi
                    ? 'teklif verdin'
                    : item.offerCount === 0
                      ? 'ilk teklif senin olabilir'
                      : `${item.offerCount} teklif`}
                </Text>
                <Text style={styles.sure}>{kalanSure(item.expiresAt)}</Text>
              </View>
            </View>
          </Pressable>
        );
      }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  liste: { paddingBottom: 40, gap: 12 },
  listeBasligi: { marginTop: 24, marginBottom: 4 },
  etiket: { ...label, color: colors.routeDeep },
  sayi: {
    color: colors.cream.ink,
    fontFamily: fonts.sansBlack,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  ortaBosluk: { marginTop: 40 },
  ilanBasili: { opacity: 0.7 },
  // Teklif verilmiş ilan listede kalıyor ama sönük: sürücü ne teklif ettiğini
  // hatırlamak isteyebilir, listeden çıkarmak bilgiyi gizlemek olurdu.
  ilanTeklifli: { backgroundColor: colors.cream.surface2, borderColor: colors.cream.line },
  teklifVerildi: { color: colors.cream.muted },
  bilgi: {
    backgroundColor: colors.routeSoft,
    borderRadius: radius.field,
    padding: 12,
    marginTop: 16,
  },
  bilgiYazi: {
    color: colors.routeDeep,
    fontFamily: fonts.sansBold,
    fontSize: 13,
    lineHeight: 19,
  },
  ilan: {
    backgroundColor: colors.cream.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cream.line,
    padding: 16,
  },
  rotaSatiri: { flexDirection: 'row', alignItems: 'flex-start' },
  rota: {
    flex: 1,
    color: colors.cream.ink,
    fontFamily: fonts.sansBold,
    fontSize: 16,
    lineHeight: 22,
  },
  detay: {
    color: colors.cream.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    marginTop: 6,
  },
  altSatir: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  tarifeEtiket: { ...label, color: colors.cream.muted },
  tutar: {
    color: colors.cream.ink,
    fontFamily: fonts.monoBold,
    fontSize: 18,
    marginTop: 4,
  },
  sagBilgi: { alignItems: 'flex-end' },
  teklif: { color: colors.routeDeep, fontFamily: fonts.sansBold, fontSize: 13 },
  sure: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 4 },
  kart: {
    backgroundColor: colors.cream.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cream.line,
    padding: 20,
    marginTop: 24,
  },
  kartBaslik: { color: colors.cream.ink, fontFamily: fonts.sansBold, fontSize: 18 },
  kartMetin: {
    color: colors.cream.muted,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  tekrar: {
    minHeight: touch.min,
    marginTop: 16,
    borderRadius: radius.field,
    backgroundColor: colors.route,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tekrarYazi: { color: colors.routeInk, fontFamily: fonts.sansBold, fontSize: 15 },
});
