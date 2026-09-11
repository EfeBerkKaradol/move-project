import type { ListingView } from '@tasiyoruz/contracts';
import { estimateRange, formatPrice, formatVolume } from '@tasiyoruz/shared';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError, apiFetch } from '../api';
import { useAuth } from '../auth/AuthContext';
import { buyukHarf, colors, fonts, label, radius, touch } from '../theme';

/**
 * İlan detayı ve teklif formu.
 *
 * <p>Ayrı bir ekran yerine alt sayfa: sürücü listeye dönmeden karar veriyor ve
 * uygulamada henüz yönlendirici gerektirecek kadar ekran yok. Ekran sayısı
 * artınca expo-router'a taşınacak (yol haritası Faz 3).
 *
 * <p>Önerilen aralık gösteriliyor ama zorlanmıyor: docs/11'e göre platform aralık
 * önerir, kesin fiyatı araç sahibi verir. Alanı aralıkla sınırlamak, sürücünün
 * kendi maliyetini bilmediğimiz durumlarda yanlış fiyat vermeye zorlardı.
 */
export function OfferSheet({
  ilan,
  aracAdi,
  kapat,
  teklifVerildi,
}: {
  ilan: ListingView | null;
  aracAdi: string;
  kapat: () => void;
  teklifVerildi: () => void;
}) {
  const { erisimTokeni } = useAuth();
  const [tutar, setTutar] = useState('');
  const [not, setNot] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  if (!ilan) return null;

  const aralik = estimateRange(ilan.estimatedAmount.amount);
  const parca = ilan.cargoItems.reduce((t, i) => t + i.quantity, 0);
  const hacim = ilan.cargoItems.reduce((t, i) => t + i.volumeM3 * i.quantity, 0);

  const gonder = async () => {
    // Virgüllü giriş Türkiye'de olağan; sunucu nokta bekliyor.
    const sayi = Number(tutar.replace(',', '.').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(sayi) || sayi < 1) {
      setHata('Geçerli bir tutar gir.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      await apiFetch(`/driver/listings/${ilan.id}/offers`, erisimTokeni, {
        method: 'POST',
        body: JSON.stringify({ amount: sayi.toFixed(2), note: not.trim() || null }),
      });
      setTutar('');
      setNot('');
      teklifVerildi();
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : 'Teklif gönderilemedi.');
    } finally {
      setGonderiliyor(false);
    }
  };

  const yer = (p: ListingView['pickup']) =>
    [p.cityName, p.districtName].filter(Boolean).join(', ') || 'Belirtilmemiş';

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={kapat}>
      <KeyboardAvoidingView
        style={styles.zemin}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.baslikSatiri}>
          <Text style={styles.etiket}>İlan {ilan.listingNumber}</Text>
          <Pressable onPress={kapat} style={styles.kapat} accessibilityRole="button">
            <Text style={styles.kapatYazi}>Kapat</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          <Text style={styles.rota}>
            {yer(ilan.pickup)} → {yer(ilan.dropoff)}
          </Text>
          <Text style={styles.detay}>
            {aracAdi}
            {parca > 0 ? ` · ${parca} parça` : ''}
            {hacim > 0 ? ` · ${formatVolume(hacim)}` : ''}
          </Text>

          {ilan.cargoItems.length > 0 && (
            <View style={styles.kutu}>
              <Text style={styles.kutuEtiket}>Yük beyanı</Text>
              {ilan.cargoItems.map((k) => (
                <View key={k.itemCode} style={styles.kalem}>
                  <Text style={styles.kalemAd}>{k.displayName}</Text>
                  <Text style={styles.kalemAdet}>{k.quantity} adet</Text>
                </View>
              ))}
            </View>
          )}

          {ilan.cargoDescription ? (
            <View style={styles.kutu}>
              <Text style={styles.kutuEtiket}>Yük veren notu</Text>
              <Text style={styles.aciklama}>{ilan.cargoDescription}</Text>
            </View>
          ) : null}

          <View style={styles.kutu}>
            <Text style={styles.kutuEtiket}>{buyukHarf('Tarife tahmini')}</Text>
            <Text style={styles.tutar}>{formatPrice(ilan.estimatedAmount.amount)}</Text>
            <Text style={styles.aciklama}>
              Benzer işlerde teklifler {formatPrice(aralik.low)} – {formatPrice(aralik.high)}{' '}
              arasında. Kesin fiyatı sen belirliyorsun.
            </Text>
          </View>

          <Text style={styles.alanEtiket}>{buyukHarf('Teklifin')}</Text>
          <TextInput
            value={tutar}
            onChangeText={setTutar}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#b9b7ae"
            style={styles.tutarAlani}
            accessibilityLabel="Teklif tutarı"
          />

          <Text style={styles.alanEtiket}>{buyukHarf('Not (isteğe bağlı)')}</Text>
          <TextInput
            value={not}
            onChangeText={setNot}
            placeholder="Ne zaman alabilirim, nasıl taşırım…"
            placeholderTextColor="#b9b7ae"
            multiline
            maxLength={500}
            style={styles.notAlani}
            accessibilityLabel="Teklif notu"
          />

          {hata && <Text style={styles.hata}>{hata}</Text>}

          <Pressable
            onPress={gonder}
            disabled={gonderiliyor}
            accessibilityRole="button"
            style={({ pressed }) => [styles.gonder, (pressed || gonderiliyor) && styles.basili]}
          >
            {gonderiliyor ? (
              <ActivityIndicator color={colors.routeInk} />
            ) : (
              <Text style={styles.gonderYazi}>Teklif ver</Text>
            )}
          </Pressable>
          <Text style={styles.dipnot}>
            Teklifin kabul edilirse adres ve iletişim bilgisi sana açılır.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  zemin: { flex: 1, backgroundColor: colors.cream.bg },
  baslikSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  etiket: { ...label, color: colors.cream.muted },
  kapat: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: 8 },
  kapatYazi: { color: colors.cream.ink, fontFamily: fonts.sansBold, fontSize: 15 },
  icerik: { padding: 20, paddingBottom: 48 },
  rota: {
    color: colors.cream.ink,
    fontFamily: fonts.sansBlack,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  detay: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 14, marginTop: 6 },
  kutu: {
    backgroundColor: colors.cream.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cream.line,
    padding: 16,
    marginTop: 16,
  },
  kutuEtiket: { ...label, color: colors.cream.muted },
  kalem: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  kalemAd: { flex: 1, color: colors.cream.ink, fontFamily: fonts.sans, fontSize: 14 },
  kalemAdet: { color: colors.cream.muted, fontFamily: fonts.mono, fontSize: 13 },
  aciklama: {
    color: colors.cream.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  tutar: { color: colors.cream.ink, fontFamily: fonts.monoBold, fontSize: 22, marginTop: 8 },
  alanEtiket: { ...label, color: colors.cream.muted, marginTop: 24, marginBottom: 8 },
  tutarAlani: {
    minHeight: 60,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.cream.line,
    backgroundColor: colors.cream.surface,
    paddingHorizontal: 16,
    color: colors.cream.ink,
    fontFamily: fonts.monoBold,
    // 16px altına inilmiyor: iOS küçük yazıda alana odaklanınca sayfayı yakınlaştırıyor
    fontSize: 24,
  },
  notAlani: {
    minHeight: 90,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.cream.line,
    backgroundColor: colors.cream.surface,
    padding: 14,
    color: colors.cream.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  hata: { color: '#8a2a1f', fontFamily: fonts.sansBold, fontSize: 13, marginTop: 12 },
  gonder: {
    minHeight: touch.min + 4,
    marginTop: 20,
    borderRadius: radius.field,
    backgroundColor: colors.route,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gonderYazi: { color: colors.routeInk, fontFamily: fonts.sansBold, fontSize: 16 },
  basili: { opacity: 0.85 },
  dipnot: {
    color: colors.cream.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
  },
});
