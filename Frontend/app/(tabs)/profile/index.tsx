import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useGetProfile } from '../../../src/hooks/useApi';
import api from '../../../src/services/api';

// Rol kodu sabitleri
const ROLE_CODES = {
  ADMIN: 0,
  CUSTOMER: 1,
  THERAPIST: 2
};

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const getProfileHook = useGetProfile();

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);
        
        // Token kontrolü
        if (!api.getToken()) {
          console.log('Token bulunamadı, login sayfasına yönlendiriliyor...');
          router.replace('/auth/login');
          return;
        }
        
        // API'den profil bilgilerini getir
        const profileData = await getProfileHook.request();
        
        if (profileData && profileData.role) {
          setUserRole(profileData.role);
          
          // Rol bazlı yönlendirme
          if (profileData.role === 'admin') {
            router.replace('/(tabs)/profile/admin');
          } else if (profileData.role === 'customer') {
            router.replace('/(tabs)/profile/customer');
          } else {
            // Terapist rolü için terapist sayfasına yönlendir
            router.replace('/(tabs)/profile/therapist');
          }
        }
      } catch (err) {
        console.error("Profil bilgileri yüklenirken hata:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9D6FF0" />
        <Text style={styles.loadingText}>Profil yükleniyor...</Text>
      </View>
    );
  }

  // Bu sayfa sadece yönlendirme için kullanılıyor, normalde görünmemeli
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#9D6FF0" />
      <Text style={styles.loadingText}>Profil yükleniyor...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
}); 