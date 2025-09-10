import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Basit Web Header Component'i - KALDIRILDI
/*
const WebHeader = () => {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.webHeaderContainer}> 
      <View style={styles.webHeaderContent}>
        <TouchableOpacity onPress={() => router.push('/')}> 
          <Text style={styles.webHeaderLogo}>NeuroMeet</Text>
        </TouchableOpacity>
        <View style={styles.webHeaderNav}>
        </View>
      </View>
    </SafeAreaView>
  );
};
*/

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const segments = useSegments();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Login ekranı kontrolü (yolu kontrol ederek - PARANTEZLER KALDIRILDI)
  const currentPath = segments.join('/');
  const isAuthScreen = currentPath.startsWith('auth'); // Parantezleri kaldır

  if (!loaded) {
    return null;
  }

  // Platforma göre render et
  if (Platform.OS === 'web') {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
          {/* WebHeader'ı gösterme mantığı KALDIRILDI */}
          {/* {!isAuthScreen && <WebHeader />} */}
          <Slot /> 
        </View>
      </ThemeProvider>
    );
  }

  // Mobil için varsayılan render
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// Stilleri düzenle: WebHeader ile ilgili stiller KALDIRILDI
const styles = StyleSheet.create({
 /* 
  webHeaderContainer: {
    backgroundColor: '#6366F1', 
    paddingHorizontal: '5%', 
  },
  webHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60, 
    width: '100%',
    maxWidth: 1200, 
    alignSelf: 'center',
  },
  webHeaderLogo: {
    color: 'white', 
    fontSize: 24,
    fontWeight: 'bold',
  },
  webHeaderNav: {
      flexDirection: 'row',
  },
  webHeaderLink: {
      color: 'white',
      marginLeft: 20,
      fontSize: 16,
  },
 */
});
