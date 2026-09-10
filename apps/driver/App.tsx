import {
  Archivo_400Regular,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { IBMPlexMono_400Regular, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { Home } from './src/screens/Home';
import { Welcome, Yukleniyor } from './src/screens/Welcome';
import { colors } from './src/theme';

/**
 * Oturum durumuna göre ekran seçimi.
 *
 * <p>Yönlendirici (expo-router) henüz yok: tek karar noktası var ve onu bir kütüphane
 * arkasına almak erken. Ekran sayısı artınca yönlendiriciye geçilecek.
 */
function Kok() {
  const auth = useAuth();
  // Durum çubuğu ekranla birlikte değişiyor: karşılama koyu, iç ekranlar açık.
  const koyu = auth.durum !== 'giris';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: koyu ? colors.dark.bg : colors.cream.bg }}>
      <StatusBar style={koyu ? 'light' : 'dark'} />
      {auth.durum === 'yukleniyor' ? <Yukleniyor /> : auth.durum === 'giris' ? <Home /> : <Welcome />}
    </SafeAreaView>
  );
}

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
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.dark.bg }} />;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Kok />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
