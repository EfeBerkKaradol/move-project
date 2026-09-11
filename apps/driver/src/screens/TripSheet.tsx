import type { TripPhotoKind, TripStage, TripView } from '@tasiyoruz/contracts';
import { TRIP_PHOTO_KIND_LABELS, TRIP_STAGE_LABELS } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, apiFetch } from '../api';
import { useAuth } from '../auth/AuthContext';
import { BilgiSeridi, Buton, HataKarti } from '../components/ui';
import { buyukHarf, colors, fonts, label, radius, touch } from '../theme';

const SIRA: TripStage[] = [
  'DRIVER_ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'LOADING', 'IN_TRANSIT',
  'ARRIVED_AT_DROPOFF', 'UNLOADING', 'DELIVERED', 'COMPLETED',
];

const FOTO_TURLERI: { kind: TripPhotoKind; ipucu: string }[] = [
  { kind: 'PICKUP', ipucu: 'Yükü hangi durumda aldığını gösterir.' },
  { kind: 'DELIVERY', ipucu: 'Teslimi bildirmek için en az bir kare gerekiyor.' },
  { kind: 'DAMAGE', ipucu: 'Bir sorun varsa burada belgele.' },
];

type Durum = { tip: 'yukleniyor' } | { tip: 'hazir'; is: TripView } | { tip: 'hata'; mesaj: string };

/**
 * İş ekranı: araç içinde tek elle kullanım — tek büyük düğme, sıradaki aşama
 * (docs/03 sürücü UI). Fotoğraf kamera ile çekiliyor; teslim bildirimi teslim
 * fotoğrafı olmadan kapalı (kanıt kuralı web ile aynı, sunucu da zorluyor).
 */
export function TripSheet({ tripId, kapat, degisti }: { tripId: string | null; kapat: () => void; degisti: () => void }) {
  const { erisimTokeni } = useAuth();
  const [durum, setDurum] = useState<Durum>({ tip: 'yukleniyor' });
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<{ metin: string; hata?: boolean } | null>(null);
  const [teslimAlan, setTeslimAlan] = useState('');
  const [teslimNotu, setTeslimNotu] = useState('');

  const yukle = useCallback(async () => {
    if (!tripId) return;
    try {
      const is = await apiFetch<TripView>(`/driver/trips/${tripId}`, erisimTokeni);
      setDurum({ tip: 'hazir', is });
    } catch (e) {
      setDurum({ tip: 'hata', mesaj: e instanceof ApiError ? e.message : 'Sunucuya ulaşılamadı.' });
    }
  }, [tripId, erisimTokeni]);

  useEffect(() => {
    setDurum({ tip: 'yukleniyor' });
    setBilgi(null);
    void yukle();
  }, [yukle]);

  const calistir = useCallback(
    async (anahtar: string, islem: () => Promise<unknown>, basari: string, hataMesaji: string) => {
      setMesgul(anahtar);
      setBilgi(null);
      try {
        await islem();
        setBilgi({ metin: basari });
        await yukle();
        degisti();
      } catch (e) {
        // Ağ hatasının kendisi de görünsün: 'yüklenemedi' tek başına teşhis ettirmiyor
        setBilgi({ metin: e instanceof ApiError ? e.message : `${hataMesaji} (${e instanceof Error ? e.message : String(e)})`, hata: true });
      } finally {
        setMesgul(null);
      }
    },
    [yukle, degisti],
  );

  const fotoYukle = useCallback(
    async (is: TripView, kind: TripPhotoKind, kaynak: 'kamera' | 'galeri') => {
      const izin =
        kaynak === 'kamera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!izin.granted) {
        setBilgi({ metin: kaynak === 'kamera' ? 'Kamera izni verilmedi.' : 'Galeri izni verilmedi.', hata: true });
        return;
      }
      const secenek: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
      const sonuc =
        kaynak === 'kamera' ? await ImagePicker.launchCameraAsync(secenek) : await ImagePicker.launchImageLibraryAsync(secenek);
      if (sonuc.canceled || !sonuc.assets[0]) return;
      const varlik = sonuc.assets[0];

      const govde = new FormData();
      const ad = varlik.fileName ?? 'foto.jpg';
      if (Platform.OS === 'web') {
        govde.append('file', await (await fetch(varlik.uri)).blob(), ad);
      } else {
        // Expo'nun fetch'i RN'in eski {uri,name,type} parçasını tanımıyor
        // ("Unsupported FormDataPart implementation"); dosya Blob olarak veriliyor.
        govde.append('file', new File(varlik.uri) as unknown as Blob, ad);
      }
      await calistir(
        `foto-${kind}`,
        () => apiFetch(`/driver/trips/${is.id}/photos/${kind}`, erisimTokeni, { method: 'POST', body: govde, timeoutMs: 60_000 }),
        `${TRIP_PHOTO_KIND_LABELS[kind]} fotoğrafı yüklendi.`,
        'Fotoğraf yüklenemedi.',
      );
    },
    [calistir, erisimTokeni],
  );

  return (
    <Modal visible={tripId !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={kapat}>
      <ScrollView style={styles.zemin} contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
        <View style={styles.ust}>
          <Text style={styles.etiket}>{buyukHarf('İş')}</Text>
          <Pressable onPress={kapat} accessibilityRole="button" style={styles.kapat}>
            <Text style={styles.kapatYazi}>Kapat</Text>
          </Pressable>
        </View>

        {durum.tip === 'yukleniyor' && <ActivityIndicator color={colors.routeDeep} style={styles.ortaBosluk} />}
        {durum.tip === 'hata' && <HataKarti mesaj={durum.mesaj} tekrar={yukle} />}
        {durum.tip === 'hazir' && <IsIcerigi
          is={durum.is}
          mesgul={mesgul}
          bilgi={bilgi}
          teslimAlan={teslimAlan}
          setTeslimAlan={setTeslimAlan}
          teslimNotu={teslimNotu}
          setTeslimNotu={setTeslimNotu}
          ilerlet={(is) =>
            calistir(
              'ilerlet',
              () => apiFetch(`/driver/trips/${is.id}/advance`, erisimTokeni, { method: 'POST', body: JSON.stringify({ stage: is.nextStage }) }),
              `${TRIP_STAGE_LABELS[is.nextStage!]} olarak işaretlendi.`,
              'Aşama ilerletilemedi.',
            )
          }
          teslimEt={(is) =>
            calistir(
              'teslim',
              () =>
                apiFetch(`/driver/trips/${is.id}/proof-of-delivery`, erisimTokeni, {
                  method: 'POST',
                  body: JSON.stringify({ receivedByName: teslimAlan.trim(), note: teslimNotu.trim() || null }),
                }),
              'Teslim bildirildi. Müşteri onaylayınca iş tamamlanır.',
              'Teslim bildirilemedi.',
            )
          }
          fotoYukle={fotoYukle}
        />}
      </ScrollView>
    </Modal>
  );
}

function IsIcerigi({
  is, mesgul, bilgi, teslimAlan, setTeslimAlan, teslimNotu, setTeslimNotu, ilerlet, teslimEt, fotoYukle,
}: {
  is: TripView;
  mesgul: string | null;
  bilgi: { metin: string; hata?: boolean } | null;
  teslimAlan: string;
  setTeslimAlan: (v: string) => void;
  teslimNotu: string;
  setTeslimNotu: (v: string) => void;
  ilerlet: (is: TripView) => void;
  teslimEt: (is: TripView) => void;
  fotoYukle: (is: TripView, kind: TripPhotoKind, kaynak: 'kamera' | 'galeri') => void;
}) {
  const ilerletilebilir = is.nextStage !== null && is.nextStage !== 'DELIVERED';
  const teslimEdilebilir = is.stage === 'ARRIVED_AT_DROPOFF' || is.stage === 'UNLOADING';
  const fotoYuklenebilir = is.stage !== 'COMPLETED';
  const fotolar = (kind: TripPhotoKind) => is.photos.filter((p) => p.kind === kind);
  const teslimFotosuVar = fotolar('DELIVERY').length > 0;
  const gecilen = new Map(is.events.map((e) => [e.stage, e]));
  const simdiki = SIRA.indexOf(is.stage);

  return (
    <>
      <Text style={styles.baslik}>{TRIP_STAGE_LABELS[is.stage]}</Text>
      <Text style={styles.tutar}>{formatPrice(is.agreedAmount.amount)}</Text>
      {bilgi && <BilgiSeridi metin={bilgi.metin} hata={bilgi.hata} />}

      {ilerletilebilir && (
        <View style={styles.kart}>
          <Text style={styles.kartEtiket}>{buyukHarf('Sıradaki aşama')}</Text>
          <Buton onPress={() => ilerlet(is)} bekliyor={mesgul === 'ilerlet'} style={styles.buyukButon}>
            {TRIP_STAGE_LABELS[is.nextStage!]}
          </Buton>
        </View>
      )}
      {is.stage === 'DELIVERED' && <BilgiSeridi metin="Teslimi bildirdin. Müşteri onaylayınca iş tamamlanır." />}
      {is.stage === 'COMPLETED' && <BilgiSeridi metin="Tamamlandı. Ödeme akışı sırada." />}

      {fotoYuklenebilir && (
        <View style={styles.kart}>
          <Text style={styles.kartEtiket}>{buyukHarf('Kareler')}</Text>
          {FOTO_TURLERI.map(({ kind, ipucu }) => {
            const liste = fotolar(kind);
            return (
              <View key={kind} style={styles.fotoBlogu}>
                <View style={styles.fotoUst}>
                  <Text style={styles.fotoAdi}>{TRIP_PHOTO_KIND_LABELS[kind]} fotoğrafı</Text>
                  <Text style={styles.fotoSayi}>{liste.length} kare</Text>
                </View>
                <Text style={styles.ipucu}>{ipucu}</Text>
                <View style={styles.fotoEylemler}>
                  <Buton tur="ikincil" onPress={() => fotoYukle(is, kind, 'kamera')} bekliyor={mesgul === `foto-${kind}`} style={styles.fotoButon}>
                    Fotoğraf çek
                  </Buton>
                  <Buton tur="ikincil" onPress={() => fotoYukle(is, kind, 'galeri')} disabled={mesgul === `foto-${kind}`} style={styles.fotoButon}>
                    Galeriden
                  </Buton>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {teslimEdilebilir && (
        <View style={styles.kart}>
          <Text style={styles.kartEtiket}>{buyukHarf('Teslim kanıtı')}</Text>
          <Text style={styles.alanEtiket}>{buyukHarf('Teslim alan kişi')}</Text>
          <TextInput
            value={teslimAlan}
            onChangeText={setTeslimAlan}
            placeholder="Ad Soyad"
            placeholderTextColor={colors.cream.muted}
            maxLength={120}
            style={styles.giris}
            accessibilityLabel="Teslim alan kişi"
          />
          <Text style={styles.alanEtiket}>{buyukHarf('Not (isteğe bağlı)')}</Text>
          <TextInput
            value={teslimNotu}
            onChangeText={setTeslimNotu}
            placeholder="Kapıda teslim edildi"
            placeholderTextColor={colors.cream.muted}
            maxLength={500}
            style={styles.giris}
            accessibilityLabel="Teslim notu"
          />
          {!teslimFotosuVar && <Text style={styles.ipucu}>Teslimi bildirmeden önce en az bir teslim fotoğrafı yükle.</Text>}
          <Buton
            onPress={() => teslimEt(is)}
            bekliyor={mesgul === 'teslim'}
            disabled={!teslimFotosuVar || teslimAlan.trim().length === 0}
            style={styles.buyukButon}
          >
            Teslim ettim
          </Buton>
        </View>
      )}

      <View style={styles.kart}>
        <Text style={styles.kartEtiket}>{buyukHarf('Zaman çizelgesi')}</Text>
        {SIRA.map((asama, i) => {
          const olay = gecilen.get(asama);
          const durumu = i < simdiki || olay ? 'gecti' : i === simdiki + 1 ? 'sirada' : 'sonra';
          return (
            <View key={asama} style={styles.zamanSatiri}>
              <View
                style={[
                  styles.nokta,
                  olay ? styles.noktaGecti : durumu === 'sirada' ? styles.noktaSirada : styles.noktaSonra,
                ]}
              />
              <Text style={[styles.zamanYazi, durumu === 'sonra' && styles.zamanSonra, asama === is.stage && styles.zamanSimdiki]}>
                {TRIP_STAGE_LABELS[asama]}
              </Text>
              {olay && (
                <Text style={styles.zamanSaat}>
                  {new Date(olay.occurredAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  zemin: { flex: 1, backgroundColor: colors.cream.bg },
  icerik: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  ust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  etiket: { ...label, color: colors.routeDeep },
  kapat: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: 8 },
  kapatYazi: { color: colors.cream.muted, fontFamily: fonts.sansBold, fontSize: 14 },
  ortaBosluk: { marginTop: 40 },
  baslik: { color: colors.cream.ink, fontFamily: fonts.sansBlack, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  tutar: { color: colors.cream.muted, fontFamily: fonts.monoBold, fontSize: 18, marginTop: 6 },
  kart: {
    backgroundColor: colors.cream.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cream.line,
    padding: 16,
    marginTop: 16,
  },
  kartEtiket: { ...label, color: colors.cream.muted },
  buyukButon: { marginTop: 12, minHeight: touch.min + 12 },
  fotoBlogu: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.cream.line, paddingTop: 12 },
  fotoUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fotoAdi: { color: colors.cream.ink, fontFamily: fonts.sansBold, fontSize: 15 },
  fotoSayi: { ...label, color: colors.cream.muted },
  ipucu: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, marginTop: 4 },
  fotoEylemler: { flexDirection: 'row', gap: 8, marginTop: 10 },
  fotoButon: { flex: 1 },
  alanEtiket: { ...label, color: colors.cream.muted, marginTop: 14, marginBottom: 6 },
  giris: {
    minHeight: touch.min + 4,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.cream.line,
    backgroundColor: colors.cream.surface2,
    paddingHorizontal: 14,
    color: colors.cream.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
  },
  zamanSatiri: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  nokta: { width: 10, height: 10, borderRadius: 5 },
  noktaGecti: { backgroundColor: colors.route },
  noktaSirada: { borderWidth: 2, borderColor: colors.route },
  noktaSonra: { borderWidth: 1, borderColor: colors.cream.line },
  zamanYazi: { flex: 1, color: colors.cream.ink, fontFamily: fonts.sans, fontSize: 14 },
  zamanSonra: { color: colors.cream.muted },
  zamanSimdiki: { fontFamily: fonts.sansBold },
  zamanSaat: { ...label, color: colors.cream.muted },
});
