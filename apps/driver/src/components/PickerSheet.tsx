import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, label, radius, touch } from '../theme';

export type Secenek = { id: string; ad: string };

/**
 * Uzun listeden tek seçim — 81 il için. Yerel bir <select> yok; kaydırılan
 * liste ve üstte süzgeç: sürücü ilk harfleri yazıp dokunuyor.
 */
export function PickerSheet({
  gorunur,
  baslik,
  secenekler,
  secili,
  sec,
  kapat,
}: {
  gorunur: boolean;
  baslik: string;
  secenekler: Secenek[];
  secili: string | null;
  sec: (id: string) => void;
  kapat: () => void;
}) {
  const [arama, setArama] = useState('');
  const suzulmus = useMemo(() => {
    const a = arama.trim().toLocaleLowerCase('tr-TR');
    return a ? secenekler.filter((s) => s.ad.toLocaleLowerCase('tr-TR').startsWith(a)) : secenekler;
  }, [arama, secenekler]);

  return (
    <Modal visible={gorunur} animationType="slide" presentationStyle="pageSheet" onRequestClose={kapat}>
      <View style={styles.zemin}>
        <View style={styles.ust}>
          <Text style={styles.baslik}>{baslik}</Text>
          <Pressable onPress={kapat} accessibilityRole="button" style={styles.kapat}>
            <Text style={styles.kapatYazi}>Kapat</Text>
          </Pressable>
        </View>
        <TextInput
          value={arama}
          onChangeText={setArama}
          placeholder="Ara"
          placeholderTextColor={colors.cream.muted}
          autoFocus
          autoCorrect={false}
          style={styles.arama}
          accessibilityLabel="Listede ara"
        />
        <FlatList
          data={suzulmus}
          keyExtractor={(s) => s.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const aktif = item.id === secili;
            return (
              <Pressable
                onPress={() => {
                  sec(item.id);
                  setArama('');
                  kapat();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: aktif }}
                style={({ pressed }) => [styles.satir, pressed && styles.basili]}
              >
                <Text style={[styles.satirYazi, aktif && styles.satirYaziAktif]}>{item.ad}</Text>
                {aktif && <Text style={styles.tik}>✓</Text>}
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={styles.bos}>Eşleşen yok.</Text>}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  zemin: { flex: 1, backgroundColor: colors.cream.bg, paddingHorizontal: 20, paddingTop: 16 },
  ust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  baslik: { ...label, color: colors.routeDeep },
  kapat: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: 8 },
  kapatYazi: { color: colors.cream.muted, fontFamily: fonts.sansBold, fontSize: 14 },
  arama: {
    minHeight: touch.min,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.cream.line,
    backgroundColor: colors.cream.surface,
    paddingHorizontal: 14,
    color: colors.cream.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
  },
  satir: {
    minHeight: touch.min + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.cream.line,
  },
  basili: { opacity: 0.6 },
  satirYazi: { color: colors.cream.ink, fontFamily: fonts.sans, fontSize: 16 },
  satirYaziAktif: { fontFamily: fonts.sansBold },
  tik: { color: colors.routeDeep, fontFamily: fonts.sansBold, fontSize: 16 },
  bos: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 14, marginTop: 16 },
});
