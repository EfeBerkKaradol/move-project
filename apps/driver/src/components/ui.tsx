import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, touch } from '../theme';

/**
 * Ekranların paylaştığı küçük parçalar. Her ekran kendi hata kartını ve
 * düğmesini yazınca üç ekranda üç ayrı "Tekrar dene" birikmişti.
 */

export function HataKarti({ mesaj, tekrar }: { mesaj: string; tekrar: () => void }) {
  return (
    <View style={styles.kart}>
      <Text style={styles.kartBaslik}>Yüklenemedi</Text>
      <Text style={styles.kartMetin}>{mesaj}</Text>
      <Buton onPress={tekrar} style={styles.tekrar}>
        Tekrar dene
      </Buton>
    </View>
  );
}

export function BosKart({ baslik, metin }: { baslik: string; metin: string }) {
  return (
    <View style={styles.kart}>
      <Text style={styles.kartBaslik}>{baslik}</Text>
      <Text style={styles.kartMetin}>{metin}</Text>
    </View>
  );
}

/** Kısa bilgi şeridi — "Teklifin gönderildi" gibi. */
export function BilgiSeridi({ metin, hata }: { metin: string; hata?: boolean }) {
  return (
    <View style={[styles.bilgi, hata && styles.bilgiHata]}>
      <Text style={[styles.bilgiYazi, hata && styles.bilgiYaziHata]}>{metin}</Text>
    </View>
  );
}

export function Buton({
  children,
  onPress,
  tur = 'birincil',
  bekliyor,
  disabled,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress: () => void;
  tur?: 'birincil' | 'ikincil' | 'tehlike';
  bekliyor?: boolean;
  disabled?: boolean;
  style?: object;
  accessibilityLabel?: string;
}) {
  const kapali = disabled || bekliyor;
  return (
    <Pressable
      onPress={onPress}
      disabled={kapali}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!kapali, busy: !!bekliyor }}
      style={({ pressed }) => [
        styles.buton,
        tur === 'birincil' ? styles.birincil : styles.ikincil,
        (pressed || kapali) && styles.basili,
        style,
      ]}
    >
      {bekliyor ? (
        <ActivityIndicator color={tur === 'birincil' ? colors.routeInk : colors.cream.ink} />
      ) : (
        <Text
          style={[
            styles.butonYazi,
            tur === 'birincil' ? styles.birincilYazi : styles.ikincilYazi,
            tur === 'tehlike' && styles.tehlikeYazi,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

/** Seçenek yongası — araç tipi, sapma, kalkış penceresi gibi kısa listeler için. */
export function Yonga({
  children,
  secili,
  onPress,
}: {
  children: React.ReactNode;
  secili: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: secili }}
      style={({ pressed }) => [styles.yonga, secili && styles.yongaSecili, pressed && styles.basili]}
    >
      <Text style={[styles.yongaYazi, secili && styles.yongaYaziSecili]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  tekrar: { marginTop: 16 },
  bilgi: { backgroundColor: colors.routeSoft, borderRadius: radius.field, padding: 12, marginTop: 16 },
  bilgiHata: { backgroundColor: colors.cream.surface2 },
  bilgiYazi: { color: colors.routeDeep, fontFamily: fonts.sansBold, fontSize: 13, lineHeight: 19 },
  bilgiYaziHata: { color: colors.cream.ink },
  buton: {
    minHeight: touch.min,
    paddingHorizontal: 16,
    borderRadius: radius.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birincil: { backgroundColor: colors.route },
  ikincil: { backgroundColor: colors.cream.surface, borderWidth: 1, borderColor: colors.cream.line },
  basili: { opacity: 0.6 },
  butonYazi: { fontFamily: fonts.sansBold, fontSize: 15 },
  birincilYazi: { color: colors.routeInk },
  ikincilYazi: { color: colors.cream.ink },
  tehlikeYazi: { color: colors.cream.muted },
  yonga: {
    minHeight: touch.min - 4,
    paddingHorizontal: 14,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.cream.line,
    backgroundColor: colors.cream.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yongaSecili: { borderColor: colors.routeDeep, backgroundColor: colors.routeSoft },
  yongaYazi: { color: colors.cream.muted, fontFamily: fonts.sansBold, fontSize: 14 },
  yongaYaziSecili: { color: colors.cream.ink },
});
