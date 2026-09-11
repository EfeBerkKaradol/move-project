import type { TripView } from '@tasiyoruz/contracts';
import { TRIP_STAGE_LABELS } from '@tasiyoruz/contracts';
import { formatPrice } from '@tasiyoruz/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, apiFetch } from '../api';
import { useAuth } from '../auth/AuthContext';
import { BosKart, HataKarti } from '../components/ui';
import { buyukHarf, colors, fonts, label, radius } from '../theme';
import { TripSheet } from './TripSheet';

type Durum = { tip: 'yukleniyor' } | { tip: 'hazir'; isler: TripView[] } | { tip: 'hata'; mesaj: string };

/**
 * Sürücünün işleri: kabul edilen teklifler burada taşımaya dönüşüyor.
 * Devam edenler üstte, tamamlananlar altta; iş kartına dokununca aşama
 * ekranı açılıyor.
 */
export function Trips() {
  const { erisimTokeni } = useAuth();
  const [durum, setDurum] = useState<Durum>({ tip: 'yukleniyor' });
  const [yenileniyor, setYenileniyor] = useState(false);
  const [acikIs, setAcikIs] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      const isler = await apiFetch<TripView[]>('/driver/trips', erisimTokeni);
      isler.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      setDurum({ tip: 'hazir', isler });
    } catch (e) {
      setDurum({ tip: 'hata', mesaj: e instanceof ApiError ? e.message : 'Sunucuya ulaşılamadı.' });
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

  if (durum.tip === 'yukleniyor') return <ActivityIndicator color={colors.routeDeep} style={styles.ortaBosluk} />;
  if (durum.tip === 'hata') return <HataKarti mesaj={durum.mesaj} tekrar={yukle} />;

  const devam = durum.isler.filter((t) => t.stage !== 'COMPLETED');
  const biten = durum.isler.filter((t) => t.stage === 'COMPLETED');

  const Satir = ({ t }: { t: TripView }) => (
    <Pressable
      onPress={() => setAcikIs(t.id)}
      accessibilityRole="button"
      accessibilityLabel={`${TRIP_STAGE_LABELS[t.stage]}, ${formatPrice(t.agreedAmount.amount)}`}
      style={({ pressed }) => [styles.kart, t.stage === 'COMPLETED' && styles.kartSonuk, pressed && styles.basili]}
    >
      <View style={styles.ustSatir}>
        <Text style={styles.asama}>{TRIP_STAGE_LABELS[t.stage]}</Text>
        <Text style={styles.ok}>›</Text>
      </View>
      <Text style={styles.detay}>
        {new Date(t.startedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
        {t.nextStage ? ` · sıradaki: ${TRIP_STAGE_LABELS[t.nextStage]}` : ''}
      </Text>
      <Text style={styles.tutar}>{formatPrice(t.agreedAmount.amount)}</Text>
    </Pressable>
  );

  return (
    <>
      <TripSheet
        tripId={acikIs}
        kapat={() => setAcikIs(null)}
        degisti={() => {
          void yukle();
        }}
      />
      <ScrollView
        contentContainerStyle={styles.icerik}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={yenile} tintColor={colors.routeDeep} />}
      >
        <View style={styles.listeBasligi}>
          <Text style={styles.etiket}>{buyukHarf('İşlerim')}</Text>
          <Text style={styles.sayi}>{devam.length === 0 ? 'Devam eden iş yok' : `${devam.length} iş devam ediyor`}</Text>
        </View>
        {devam.length === 0 && biten.length === 0 && (
          <BosKart baslik="Henüz iş yok" metin="Teklifin kabul edilince iş burada açılır; aşamaları buradan ilerletirsin." />
        )}
        {devam.map((t) => (
          <Satir key={t.id} t={t} />
        ))}
        {biten.length > 0 && (
          <>
            <Text style={[styles.etiket, styles.bolumBasligi]}>{buyukHarf(`Tamamlanan (${biten.length})`)}</Text>
            {biten.map((t) => (
              <Satir key={t.id} t={t} />
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  icerik: { paddingBottom: 40, gap: 12 },
  listeBasligi: { marginTop: 24, marginBottom: 4 },
  etiket: { ...label, color: colors.routeDeep },
  bolumBasligi: { marginTop: 16 },
  sayi: { color: colors.cream.ink, fontFamily: fonts.sansBlack, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, marginTop: 8 },
  ortaBosluk: { marginTop: 40 },
  kart: {
    backgroundColor: colors.cream.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cream.line,
    padding: 16,
  },
  kartSonuk: { backgroundColor: colors.cream.surface2 },
  basili: { opacity: 0.7 },
  ustSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  asama: { color: colors.cream.ink, fontFamily: fonts.sansBold, fontSize: 16 },
  ok: { color: colors.cream.muted, fontFamily: fonts.sansBold, fontSize: 22, lineHeight: 24 },
  detay: { color: colors.cream.muted, fontFamily: fonts.sans, fontSize: 13, marginTop: 6 },
  tutar: { color: colors.cream.ink, fontFamily: fonts.monoBold, fontSize: 18, marginTop: 10 },
});
