import type { ListingView, OfferStatus, OfferView } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiError, apiFetch } from '../api';
import { useAuth } from '../auth/AuthContext';
import { buyukHarf, colors, fonts, label, radius, touch } from '../theme';

type Durum =
  | { tip: 'yukleniyor' }
  | { tip: 'hazir'; teklifler: OfferView[]; ilanlar: Record<string, ListingView> }
  | { tip: 'hata'; mesaj: string };

/** Web'deki StatusPill ile aynı sözcükler: iki yüzey aynı durumu farklı adlandırmasın. */
const DURUM_ETIKETI: Record<OfferStatus, string> = {
  SUBMITTED: 'Bekliyor',
  ACCEPTED: 'Kabul edildi',
  REJECTED: 'Reddedildi',
  WITHDRAWN: 'Geri çekildi',
};

function yer(p: ListingView['pickup']): string {
  return [p.cityName, p.districtName].filter(Boolean).join(', ') || 'Belirtilmemiş';
}

function tarih(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Onay sorusu. Alert.alert tarayıcıda çalışmıyor (react-native-web'de boş);
 * Expo web'de geliştirirken geri çekme sessizce hiçbir şey yapmasın.
 */
function onayla(baslik: string, mesaj: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${baslik}\n\n${mesaj}`));
  return new Promise((cozumle) => {
    Alert.alert(baslik, mesaj, [
      { text: 'Vazgeç', style: 'cancel', onPress: () => cozumle(false) },
      { text: 'Geri çek', style: 'destructive', onPress: () => cozumle(true) },
    ]);
  });
}

/**
 * Sürücünün verdiği teklifler.
 *
 * <p>Teklif kaydı rotayı taşımıyor (yalnızca listingId); sürücü "17.250 TL"
 * görünce hangi iş olduğunu hatırlamıyor. Her teklifin ilanı ayrıca çekiliyor;
 * ilan artık görünmüyorsa (süresi dolmuş, iptal) satır ilan numarasıyla kalıyor,
 * teklif listeden düşmüyor — sürücü ne teklif ettiğini görebilmeli.
 *
 * <p>Bekleyen teklif geri çekilebiliyor; kabul edilmiş ya da sonuçlanmış teklife
 * dokunulmuyor. Kural sunucuda da var, buradaki yalnızca düğmeyi gizliyor.
 */
export function Offers() {
  const { erisimTokeni } = useAuth();
  const [durum, setDurum] = useState<Durum>({ tip: 'yukleniyor' });
  const [yenileniyor, setYenileniyor] = useState(false);
  const [cekilen, setCekilen] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      const teklifler = await apiFetch<OfferView[]>('/driver/offers', erisimTokeni);
      teklifler.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      const ilanIdleri = [...new Set(teklifler.map((t) => t.listingId))];
      const sonuclar = await Promise.allSettled(
        ilanIdleri.map((id) => apiFetch<ListingView>(`/driver/listings/${id}`, erisimTokeni)),
      );
      const ilanlar: Record<string, ListingView> = {};
      sonuclar.forEach((s, i) => {
        if (s.status === 'fulfilled') ilanlar[ilanIdleri[i]] = s.value;
      });
      setDurum({ tip: 'hazir', teklifler, ilanlar });
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

  const geriCek = useCallback(
    async (teklif: OfferView, rota: string) => {
      const evet = await onayla('Teklifi geri çek', `${rota} için ${formatPrice(teklif.amount.amount)} teklifin silinecek.`);
      if (!evet) return;
      setCekilen(teklif.id);
      setBilgi(null);
      try {
        await apiFetch(`/driver/offers/${teklif.id}/withdraw`, erisimTokeni, { method: 'POST' });
        setBilgi('Teklif geri çekildi.');
        await yukle();
      } catch (e) {
        setBilgi(e instanceof ApiError ? e.message : 'Teklif geri çekilemedi.');
      } finally {
        setCekilen(null);
      }
    },
    [erisimTokeni, yukle],
  );

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

  const bekleyen = durum.teklifler.filter((t) => t.status === 'SUBMITTED').length;

  return (
    <>
      {bilgi && (
        <View style={styles.bilgi}>
          <Text style={styles.bilgiYazi}>{bilgi}</Text>
        </View>
      )}
      <FlatList
        data={durum.teklifler}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.liste}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={yenile} tintColor={colors.routeDeep} />
        }
        ListHeaderComponent={
          <View style={styles.listeBasligi}>
            <Text style={styles.etiket}>{buyukHarf('Tekliflerim')}</Text>
            <Text style={styles.sayi}>
              {durum.teklifler.length === 0
                ? 'Henüz teklif yok'
                : bekleyen === 0
                  ? `${durum.teklifler.length} teklif`
                  : `${bekleyen} teklif yanıt bekliyor`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.kart}>
            <Text style={styles.kartBaslik}>Henüz teklif vermedin</Text>
            <Text style={styles.kartMetin}>
              Açık ilanlardan birine dokunup fiyatını yaz; verdiğin teklifler burada toplanır.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ilan = durum.ilanlar[item.listingId];
          const rota = ilan ? `${yer(ilan.pickup)} → ${yer(ilan.dropoff)}` : 'İlan artık görünmüyor';
          const bekliyor = item.status === 'SUBMITTED';
          const cekiliyor = cekilen === item.id;
          return (
            <View style={[styles.teklif, !bekliyor && styles.teklifKapali]}>
              <View style={styles.ustSatir}>
                <Text style={styles.rota} numberOfLines={2}>
                  {rota}
                </Text>
                <View style={[styles.rozet, bekliyor ? styles.rozetBekliyor : item.status === 'ACCEPTED' ? styles.rozetKabul : styles.rozetSonuc]}>
                  <Text style={[styles.rozetYazi, bekliyor ? styles.rozetYaziBekliyor : item.status === 'ACCEPTED' ? styles.rozetYaziKabul : styles.rozetYaziSonuc]}>
                    {buyukHarf(DURUM_ETIKETI[item.status])}
                  </Text>
                </View>
              </View>
              {ilan && (
                <Text style={styles.detay}>
                  {ilan.listingNumber}
                  {ilan.cargoItems.length > 0 ? ` · ${ilan.cargoItems.reduce((t, i) => t + i.quantity, 0)} parça` : ''}
                </Text>
              )}
              {item.note ? (
                <Text style={styles.not} numberOfLines={3}>
                  “{item.note}”
                </Text>
              ) : null}
              <View style={styles.altSatir}>
                <View>
                  <Text style={styles.tutarEtiket}>{buyukHarf('teklifin')}</Text>
                  <Text style={styles.tutar}>{formatPrice(item.amount.amount)}</Text>
                </View>
                <View style={styles.sagBilgi}>
                  {bekliyor ? (
                    <Pressable
                      onPress={() => geriCek(item, rota)}
                      disabled={cekiliyor}
                      accessibilityRole="button"
                      accessibilityLabel={`${rota} teklifini geri çek`}
                      style={({ pressed }) => [styles.geriCek, pressed && styles.basili, cekiliyor && styles.basili]}
                    >
                      {cekiliyor ? (
                        <ActivityIndicator color={colors.cream.ink} />
                      ) : (
                        <Text style={styles.geriCekYazi}>Geri çek</Text>
                      )}
                    </Pressable>
                  ) : null}
                  <Text style={styles.zaman}>{tarih(item.submittedAt)}</Text>
                </View>
              </View>
            </View>
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
  bilgi: {
    backgroundColor: colors.routeSoft,
    borderRadius: radius.field,
    padding: 12,
    marginTop: 16,
  },
  bilgiYazi: { color: colors.routeDeep, fontFamily: fonts.sansBold, fontSize: 13, lineHeight: 19 },
  teklif: {
    backgroundColor: colors.cream.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cream.line,
    padding: 16,
  },
  // Sonuçlanmış teklif listede kalıyor ama sönük — bekleyenler göze çarpsın
  teklifKapali: { backgroundColor: colors.cream.surface2 },
  ustSatir: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rota: { flex: 1, color: colors.cream.ink, fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 22 },
  rozet: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  rozetBekliyor: { backgroundColor: colors.routeSoft },
  rozetKabul: { backgroundColor: colors.success },
  rozetSonuc: { backgroundColor: colors.cream.surface2, borderWidth: 1, borderColor: colors.cream.line },
  rozetYazi: { ...label, fontSize: 10 },
  rozetYaziBekliyor: { color: colors.routeDeep },
  rozetYaziKabul: { color: colors.routeInk },
  rozetYaziSonuc: { color: colors.cream.muted },
  detay: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 13, marginTop: 6 },
  not: { color: colors.cream.ink, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, marginTop: 10 },
  altSatir: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  tutarEtiket: { ...label, color: colors.cream.muted },
  tutar: { color: colors.cream.ink, fontFamily: fonts.monoBold, fontSize: 18, marginTop: 4 },
  sagBilgi: { alignItems: 'flex-end', gap: 6 },
  geriCek: {
    minHeight: touch.min,
    minWidth: touch.min,
    paddingHorizontal: 14,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.cream.line,
    backgroundColor: colors.cream.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geriCekYazi: { color: colors.cream.ink, fontFamily: fonts.sansBold, fontSize: 14 },
  basili: { opacity: 0.6 },
  zaman: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 12 },
  kart: {
    backgroundColor: colors.cream.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cream.line,
    padding: 20,
    marginTop: 24,
  },
  kartBaslik: { color: colors.cream.ink, fontFamily: fonts.sansBold, fontSize: 18 },
  kartMetin: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, marginTop: 8 },
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
