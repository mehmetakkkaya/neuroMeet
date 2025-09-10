import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useGetProfile } from '../src/hooks/useApi';
import api from '../src/services/api';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getProfileHook = useGetProfile();
  
  useEffect(() => {
    // Token kontrolü
    const checkAuth = async () => {
      try {
        // Token var mı kontrol et
        if (!api.getToken()) {
          // Token yoksa login sayfasına yönlendir
          setLoading(false);
          return;
        }
        
        // Profil bilgilerini getir (sadece token geçerliliğini kontrol etmek için)
        await getProfileHook.request();
      } catch (error) {
        console.error('Oturum kontrolü yapılırken hata:', error);
        setError('Oturum bilgileri alınamadı. Lütfen tekrar giriş yapın.');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#9D6FF0" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }
  
  if (error) {
    return <Redirect href="/auth/login" />;
  }
  
  // Ana sekmelere yönlendir
  // Rol kontrolü artık (tabs)/index.tsx içinde yapılacak
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  }
}); 