import type { CreateCorridorRequest, District, VehicleType } from '@tasiyoruz/contracts';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, apiFetch } from '../api';
import { useAuth } from '../auth/AuthContext';
import { PickerSheet } from '../components/PickerSheet';
import { BilgiSeridi, Buton, Yonga } from '../components/ui';
import { buyukHarf, colors, fonts, label, radius, touch } from '../theme';

/** Sapma seçenekleri: araç içinde sayı yazdırmak yerine dokunulacak birkaç değer. */
const SAPMALAR = [30, 50, 80, 120, 200] as const;

/**
 * Kalkış penceresi hazır seçenekler. Web'de tarih-saat alanı var; telefonda
 * iki tarih seçiciyi doldurmak sürücüyü formdan kaçırıyor. Pencere geniş
 * tutuluyor — eşleştirme zaten koridorun zaman uyumunu puanlıyor.
 */
const PENCERELER = [
  { id: 'bugun', ad: 'Bugün' },
  { id: 'yarin', ad: 'Yarın' },
  { id: 'uc-gun', ad: '3 gün içinde' },
  { id: 'hafta', ad: 'Bu hafta' },
] as const;
type Pencere = (typeof PENCERELER)[number]['id'];

export function pencereAraligi(id: Pencere, simdi = new Date()): { from: Date; to: Date } {
  const birSaatSonra = new Date(simdi.getTime() + 3_600_000);
  const gunSonu = (g: Date) => new Date(g.getFullYear(), g.getMonth(), g.getDate(), 23, 59, 0, 0);
  switch (id) {
    case 'bugun': {
      const to = gunSonu(simdi);
      // Gece geç saatte "bugün" bir saatten kısa kalıyorsa pencereyi üç saate uzat
      return { from: birSaatSonra, to: to > birSaatSonra ? to : new Date(birSaatSonra.getTime() + 3 * 3_600_000) };
    }
    case 'yarin': {
      const y = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() + 1, 6, 0, 0, 0);
      return { from: y, to: gunSonu(y) };
    }
    case 'uc-gun':
      return { from: birSaatSonra, to: new Date(simdi.getTime() + 72 * 3_600_000) };
    case 'hafta':
      return { from: birSaatSonra, to: new Date(simdi.getTime() + 7 * 24 * 3_600_000) };
  }
}

/**
 * Yeni koridor formu.
 *
 * <p>Kalkış ve varış il düzeyinde: koridor şehirlerarası bir dönüş rotası,
 * ilçe hassasiyeti eşleştirmeye bir şey katmıyor (web'deki formla aynı karar).
 */
export function CorridorSheet({
  gorunur,
  iller,
  araclar,
  kapat,
  kaydedildi,
}: {
  gorunur: boolean;
  /** İl başına tek temsilci ilçe. */
  iller: District[];
  araclar: VehicleType[];
  kapat: () => void;
  kaydedildi: () => void;
}) {
  const { erisimTokeni } = useAuth();
  const [nereden, setNereden] = useState<string | null>(null);
  const [nereye, setNereye] = useState<string | null>(null);
  const [arac, setArac] = useState<string | null>(araclar[0]?.code ?? null);
  const [sapma, setSapma] = useState<number>(80);
  const [pencere, setPencere] = useState<Pencere>('uc-gun');
  const [altSinir, setAltSinir] = useState('');
  const [secici, setSecici] = useState<'nereden' | 'nereye' | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const ilAdi = (id: string | null) => iller.find((i) => i.id === id)?.cityName ?? null;
  const ayniUc = nereden !== null && nereden === nereye;
  const hazir = nereden && nereye && arac && !ayniUc;

  const kaydet = async () => {
    if (!hazir) return;
    setGonderiliyor(true);
    setHata(null);
    const { from, to } = pencereAraligi(pencere);
    const alt = altSinir.replace(',', '.').replace(/[^\d.]/g, '');
    const istek: CreateCorridorRequest = {
      vehicleTypeCode: arac!,
      originDistrictId: nereden!,
      destinationDistrictId: nereye!,
      departureFrom: from.toISOString(),
      departureTo: to.toISOString(),
      detourToleranceKm: sapma,
      minAmount: alt ? Number(alt).toFixed(2) : null,
    };
    try {
      await apiFetch('/driver/corridors', erisimTokeni, { method: 'POST', body: JSON.stringify(istek) });
      setNereden(null);
      setNereye(null);
      setAltSinir('');
      kaydedildi();
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : 'Koridor kaydedilemedi.');
    } finally {
      setGonderiliyor(false);
    }
  };

  const secenekler = iller.map((i) => ({ id: i.id, ad: i.cityName }));

  return (
    <Modal visible={gorunur} animationType="slide" presentationStyle="pageSheet" onRequestClose={kapat}>
      <ScrollView style={styles.zemin} contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
        <View style={styles.ust}>
          <Text style={styles.etiket}>{buyukHarf('Yeni koridor')}</Text>
          <Pressable onPress={kapat} accessibilityRole="button" style={styles.kapat}>
            <Text style={styles.kapatYazi}>Kapat</Text>
          </Pressable>
        </View>
        <Text style={styles.baslik}>Dönüş rotanı kaydet.</Text>
        <Text style={styles.aciklama}>
          Yükü bıraktığın şehirden dönerken boş gitme; bu rotaya düşen ilanlar sana gelsin.
        </Text>

        <Text style={styles.alanEtiket}>{buyukHarf('Nereden dönüyorsun')}</Text>
        <SecimAlani deger={ilAdi(nereden)} bos="İl seç" onPress={() => setSecici('nereden')} />

        <Text style={styles.alanEtiket}>{buyukHarf('Nereye dönüyorsun')}</Text>
        <SecimAlani deger={ilAdi(nereye)} bos="İl seç" onPress={() => setSecici('nereye')} />
        {ayniUc && <Text style={styles.uyari}>Kalkış ve varış aynı olamaz.</Text>}

        <Text style={styles.alanEtiket}>{buyukHarf('Aracın')}</Text>
        <View style={styles.yongalar}>
          {araclar.map((a) => (
            <Yonga key={a.code} secili={arac === a.code} onPress={() => setArac(a.code)}>
              {a.displayName}
            </Yonga>
          ))}
        </View>

        <Text style={styles.alanEtiket}>{buyukHarf('Rotandan en fazla sapma')}</Text>
        <View style={styles.yongalar}>
          {SAPMALAR.map((km) => (
            <Yonga key={km} secili={sapma === km} onPress={() => setSapma(km)}>
              {km} km
            </Yonga>
          ))}
        </View>
        <Text style={styles.ipucu}>Yükü almak için yolundan ne kadar ayrılabilirsin.</Text>

        <Text style={styles.alanEtiket}>{buyukHarf('Ne zaman yola çıkıyorsun')}</Text>
        <View style={styles.yongalar}>
          {PENCERELER.map((p) => (
            <Yonga key={p.id} secili={pencere === p.id} onPress={() => setPencere(p.id)}>
              {p.ad}
            </Yonga>
          ))}
        </View>

        <Text style={styles.alanEtiket}>{buyukHarf('Alt sınır (₺, isteğe bağlı)')}</Text>
        <TextInput
          value={altSinir}
          onChangeText={setAltSinir}
          keyboardType="decimal-pad"
          placeholder="Örn. 4000"
          placeholderTextColor={colors.cream.muted}
          style={styles.giris}
          accessibilityLabel="Alt sınır"
        />
        <Text style={styles.ipucu}>Tarife tahmini bunun altındaki ilanlar sana hiç gösterilmez.</Text>

        {hata && <BilgiSeridi metin={hata} hata />}
        <Buton onPress={kaydet} bekliyor={gonderiliyor} disabled={!hazir} style={styles.kaydet}>
          Koridoru kaydet
        </Buton>
      </ScrollView>

      <PickerSheet
        gorunur={secici !== null}
        baslik={secici === 'nereden' ? 'Nereden dönüyorsun' : 'Nereye dönüyorsun'}
        secenekler={secenekler}
        secili={secici === 'nereden' ? nereden : nereye}
        sec={(id) => (secici === 'nereden' ? setNereden(id) : setNereye(id))}
        kapat={() => setSecici(null)}
      />
    </Modal>
  );
}

function SecimAlani({ deger, bos, onPress }: { deger: string | null; bos: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={deger ?? bos}
      style={({ pressed }) => [styles.secim, pressed && styles.basili]}
    >
      <Text style={[styles.secimYazi, !deger && styles.secimBos]}>{deger ?? bos}</Text>
      <Text style={styles.secimOk}>▾</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zemin: { flex: 1, backgroundColor: colors.cream.bg },
  icerik: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  ust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  etiket: { ...label, color: colors.routeDeep },
  kapat: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: 8 },
  kapatYazi: { color: colors.cream.muted, fontFamily: fonts.sansBold, fontSize: 14 },
  baslik: { color: colors.cream.ink, fontFamily: fonts.sansBlack, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  aciklama: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, marginTop: 8 },
  alanEtiket: { ...label, color: colors.cream.muted, marginTop: 24, marginBottom: 8 },
  secim: {
    minHeight: touch.min + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.cream.line,
    backgroundColor: colors.cream.surface,
    paddingHorizontal: 14,
  },
  basili: { opacity: 0.6 },
  secimYazi: { color: colors.cream.ink, fontFamily: fonts.sansBold, fontSize: 16 },
  secimBos: { color: colors.cream.muted, fontFamily: fonts.sans },
  secimOk: { color: colors.cream.muted, fontSize: 16 },
  uyari: { color: colors.warning, fontFamily: fonts.sansBold, fontSize: 13, marginTop: 8 },
  yongalar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ipucu: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, marginTop: 8 },
  giris: {
    minHeight: touch.min + 4,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.cream.line,
    backgroundColor: colors.cream.surface,
    paddingHorizontal: 14,
    color: colors.cream.ink,
    fontFamily: fonts.monoBold,
    fontSize: 16,
  },
  kaydet: { marginTop: 24 },
});
