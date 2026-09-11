import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, touch } from '../theme';

export type Sekme = 'ilanlar' | 'donus' | 'isler' | 'teklifler';

const SEKMELER: { id: Sekme; ad: string; yol: string }[] = [
  { id: 'ilanlar', ad: 'İlanlar', yol: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'donus', ad: 'Boş dönüş', yol: 'M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm14-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 15h5a4 4 0 0 0 4-4V9' },
  { id: 'isler', ad: 'İşlerim', yol: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM6 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z' },
  { id: 'teklifler', ad: 'Teklifler', yol: 'M4 12V5h7l9 9-7 7-9-9Zm4-4h.01' },
];

/**
 * Alt sekme çubuğu. Dört görünüm bir segment kontrolüne sığmıyordu; araç
 * içinde başparmakla ulaşılan yer de ekranın altı.
 */
export function TabBar({ secili, sec }: { secili: Sekme; sec: (s: Sekme) => void }) {
  return (
    <View style={styles.cubuk} accessibilityRole="tablist">
      {SEKMELER.map((s) => {
        const aktif = s.id === secili;
        const renk = aktif ? colors.cream.ink : colors.cream.muted;
        return (
          <Pressable
            key={s.id}
            onPress={() => sec(s.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktif }}
            style={({ pressed }) => [styles.sekme, pressed && styles.basili]}
          >
            <View style={[styles.ikonKutu, aktif && styles.ikonKutuAktif]}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d={s.yol} stroke={aktif ? colors.routeInk : renk} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={[styles.yazi, { color: renk }]}>{s.ad}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cubuk: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.cream.line,
    backgroundColor: colors.cream.surface,
    paddingTop: 6,
    paddingBottom: 4,
  },
  sekme: { flex: 1, minHeight: touch.min + 8, alignItems: 'center', justifyContent: 'center', gap: 3 },
  basili: { opacity: 0.6 },
  ikonKutu: { width: 44, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ikonKutuAktif: { backgroundColor: colors.route },
  yazi: { fontFamily: fonts.sansBold, fontSize: 11 },
});
