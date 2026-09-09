import {
  Archivo_400Regular,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { IBMPlexMono_400Regular, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from './src/components/Logo';
import { colors, fonts, label, radius, touch } from './src/theme';

/**
 * Sürücü uygulamasının karşılama ekranı.
 *
 * <p>Koyu zemin: web'in hero bölümüyle aynı ikili (koyu marka alanı, açık içerik).
 * Sürücü uygulaması gün ışığında ve araç içinde açılıyor; ilk ekranın yüksek
 * kontrastlı olması okunurluk için de doğru.
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_700Bold,
  });

  // Yazı tipleri yüklenmeden çizmiyoruz: sistem fontuyla bir kare çizip sonra
  // Archivo'ya geçmek gözle görülür bir sıçrama yaratıyor.
  if (!fontsLoaded) return <View style={styles.bos} />;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.zemin}>
        <StatusBar style="light" />

        <View style={styles.marka}>
          <Logo size={30} />
          <Text style={styles.markaAdi}>KARINCA</Text>
        </View>

        <View style={styles.orta}>
          <Text style={styles.etiket}>Sürücü</Text>
          <Text style={styles.baslik}>Yol boş gitmesin.</Text>
          <Text style={styles.aciklama}>
            Dönüş rotanı gir, rotana düşen yükleri gör. Teklif ver, işi al, yolu
            dolu tamamla.
          </Text>
        </View>

        <View style={styles.altBolum}>
          <Pressable style={({ pressed }) => [styles.birincilButon, pressed && styles.basili]}>
            <Text style={styles.birincilYazi}>Giriş yap</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.ikincilButon, pressed && styles.basili]}>
            <Text style={styles.ikincilYazi}>Hesap oluştur</Text>
          </Pressable>
          <Text style={styles.dipnot}>
            Teklif verebilmek için belgelerini yükleyip onay alman gerekiyor.
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bos: { flex: 1, backgroundColor: colors.dark.bg },
  zemin: { flex: 1, backgroundColor: colors.dark.bg, paddingHorizontal: 24 },
  marka: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  markaAdi: {
    color: colors.dark.ink,
    fontFamily: fonts.sansBlack,
    fontSize: 19,
    letterSpacing: -0.3,
  },
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
