import { CARRIER_STATUS_LABELS, type CarrierProfileView } from '@tasiyoruz/contracts';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, apiFetch } from '../api';
import { Listings } from './Listings';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Logo';
import { colors, fonts, label, radius, touch } from '../theme';

type Durum =
  | { tip: 'yukleniyor' }
  | { tip: 'basvuru-yok' }
  | { tip: 'profil'; profil: CarrierProfileView }
  | { tip: 'hata'; mesaj: string };

/**
 * Giriş yapmış sürücünün ekranı.
 *
 * <p>Onaylı taşıyıcıya açık ilanlar, onaylanmamışa başvuru durumu gösteriliyor.
 * Ayrım ürün kuralından: teklif verebilmek onaylı olmayı gerektiriyor, dolayısıyla
 * onaylanmamış bir sürücüye ilan listesi göstermek yanıltıcı olurdu — göreceği ama
 * teklif veremeyeceği yükler.
 */
export function Home() {
  const { kullanici, cikisYap, erisimTokeni } = useAuth() as ReturnType<typeof useAuth> & {
    kullanici: { ad: string | null; eposta: string | null };
  };
  const [durum, setDurum] = useState<Durum>({ tip: 'yukleniyor' });

  const yukle = useCallback(async () => {
    setDurum({ tip: 'yukleniyor' });
    try {
      const profil = await apiFetch<CarrierProfileView | undefined>(
        '/carrier/profile',
        erisimTokeni,
      );
      setDurum(profil ? { tip: 'profil', profil } : { tip: 'basvuru-yok' });
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

  const onayli = durum.tip === 'profil' && durum.profil.status === 'APPROVED';

  const ustBar = (
    <>
      <View style={styles.ustBar}>
        <View style={styles.marka}>
          <Logo size={26} />
          <Text style={styles.markaAdi}>KARINCA</Text>
        </View>
        <Pressable onPress={cikisYap} accessibilityRole="button" style={styles.cikis}>
          <Text style={styles.cikisYazi}>Çıkış</Text>
        </Pressable>
      </View>

    </>
  );

  // Onaylıysa liste kendi kaydırmasını yönetiyor; ScrollView içine koymak iç içe
  // kaydırma yaratır ve FlatList'in geri dönüşümü çalışmaz.
  if (onayli) {
    return (
      <View style={[styles.zemin, styles.icerik]}>
        {ustBar}
        <Listings />
      </View>
    );
  }

  return (
    <ScrollView style={styles.zemin} contentContainerStyle={styles.icerik}>
      {ustBar}
      <Text style={styles.etiket}>Sürücü</Text>
      <Text style={styles.baslik}>{kullanici?.ad ?? kullanici?.eposta ?? 'Hoş geldin'}</Text>

      <View style={styles.kart}>
        <Text style={styles.kartEtiket}>Başvuru durumu</Text>
        {durum.tip === 'yukleniyor' && <ActivityIndicator color={colors.route} style={styles.bosluk} />}

        {durum.tip === 'basvuru-yok' && (
          <>
            <Text style={styles.kartBaslik}>Henüz başvurmadın</Text>
            <Text style={styles.kartMetin}>
              Teklif verebilmek için ehliyet, ruhsat ve sigorta belgelerini yükleyip
              onay alman gerekiyor.
            </Text>
          </>
        )}

        {durum.tip === 'profil' && (
          <>
            <Text style={styles.kartBaslik}>{CARRIER_STATUS_LABELS[durum.profil.status]}</Text>
            <Text style={styles.kartMetin}>
              {durum.profil.plate} · {durum.profil.displayName}
            </Text>
            {durum.profil.missingDocuments.length > 0 && (
              <Text style={styles.uyari}>
                {durum.profil.missingDocuments.length} belge eksik.
              </Text>
            )}
          </>
        )}

        {durum.tip === 'hata' && (
          <>
            <Text style={styles.kartBaslik}>Yüklenemedi</Text>
            <Text style={styles.kartMetin}>{durum.mesaj}</Text>
            <Pressable onPress={yukle} style={styles.tekrar} accessibilityRole="button">
              <Text style={styles.tekrarYazi}>Tekrar dene</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  zemin: { flex: 1, backgroundColor: colors.cream.bg },
  icerik: { paddingHorizontal: 20, paddingBottom: 40 },
  ustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  marka: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markaAdi: { color: colors.cream.ink, fontFamily: fonts.sansBlack, fontSize: 16, letterSpacing: -0.2 },
  cikis: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cikisYazi: { color: colors.cream.muted, fontFamily: fonts.sansBold, fontSize: 14 },
  etiket: { ...label, color: colors.routeDeep, marginTop: 20 },
  baslik: {
    color: colors.cream.ink,
    fontFamily: fonts.sansBlack,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
    marginTop: 8,
  },
  kart: {
    backgroundColor: colors.cream.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cream.line,
    padding: 20,
    marginTop: 24,
  },
  kartEtiket: { ...label, color: colors.cream.muted },
  kartBaslik: {
    color: colors.cream.ink,
    fontFamily: fonts.sansBold,
    fontSize: 19,
    marginTop: 10,
  },
  kartMetin: {
    color: colors.cream.muted,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  uyari: { color: '#8a2a1f', fontFamily: fonts.sansBold, fontSize: 13, marginTop: 10 },
  bosluk: { marginTop: 16, alignSelf: 'flex-start' },
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
