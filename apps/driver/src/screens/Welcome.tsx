import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Logo';
import { colors, fonts, label, radius, touch } from '../theme';

/**
 * Karşılama ekranı.
 *
 * <p>Koyu zemin: web'in hero bölümüyle aynı ikili. Sürücü uygulaması gün ışığında
 * ve araç içinde açılıyor; yüksek kontrast okunurluk için de doğru.
 */
export function Welcome() {
  const { girisYap, kayitOl, hata } = useAuth();
  return (
    <View style={styles.zemin}>
      <View style={styles.marka}>
        <Logo size={30} />
        <Text style={styles.markaAdi}>KARINCA</Text>
      </View>

      <View style={styles.orta}>
        <Text style={styles.etiket}>Sürücü</Text>
        <Text style={styles.baslik}>Yol boş gitmesin.</Text>
        <Text style={styles.aciklama}>
          Dönüş rotanı gir, rotana düşen yükleri gör. Teklif ver, işi al, yolu dolu
          tamamla.
        </Text>
      </View>

      <View style={styles.altBolum}>
        {hata && <Text style={styles.hata}>{hata}</Text>}
        <Pressable
          onPress={girisYap}
          accessibilityRole="button"
          style={({ pressed }) => [styles.birincilButon, pressed && styles.basili]}
        >
          <Text style={styles.birincilYazi}>Giriş yap</Text>
        </Pressable>
        <Pressable
          onPress={kayitOl}
          accessibilityRole="button"
          style={({ pressed }) => [styles.ikincilButon, pressed && styles.basili]}
        >
          <Text style={styles.ikincilYazi}>Hesap oluştur</Text>
        </Pressable>
        <Text style={styles.dipnot}>
          Teklif verebilmek için belgelerini yükleyip onay alman gerekiyor.
        </Text>
      </View>
    </View>
  );
}

/** Açılışta saklı oturum sınanırken görünen ekran. */
export function Yukleniyor() {
  return (
    <View style={[styles.zemin, styles.ortala]}>
      <Logo size={34} />
      <ActivityIndicator color={colors.route} style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  zemin: { flex: 1, backgroundColor: colors.dark.bg, paddingHorizontal: 24 },
  ortala: { alignItems: 'center', justifyContent: 'center' },
  marka: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  markaAdi: { color: colors.dark.ink, fontFamily: fonts.sansBlack, fontSize: 19, letterSpacing: -0.3 },
  orta: { flex: 1, justifyContent: 'center' },
  etiket: { ...label, color: colors.route },
  baslik: {
    color: colors.dark.ink,
    fontFamily: fonts.sansBlack,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    marginTop: 12,
  },
  aciklama: {
    color: colors.dark.muted,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 16,
    maxWidth: 320,
  },
  altBolum: { paddingBottom: 12, gap: 12 },
  hata: {
    color: colors.dark.ink,
    backgroundColor: '#4a1f18',
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    padding: 12,
    borderRadius: radius.field,
  },
  birincilButon: {
    minHeight: touch.min,
    borderRadius: radius.field,
    backgroundColor: colors.route,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birincilYazi: { color: colors.routeInk, fontFamily: fonts.sansBold, fontSize: 16 },
  ikincilButon: {
    minHeight: touch.min,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.dark.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ikincilYazi: { color: colors.dark.ink, fontFamily: fonts.sansBold, fontSize: 16 },
  basili: { opacity: 0.85 },
  dipnot: {
    color: colors.dark.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
  },
});
