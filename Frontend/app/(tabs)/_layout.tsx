import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { useGetProfile } from '../../src/hooks/useApi';
import api from '../../src/services/api';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [userRole, setUserRole] = useState<string | null>(null);
  const getProfileHook = useGetProfile();
  
  useEffect(() => {
    // Kullanıcı rolünü kontrol et
    const checkUserRole = async () => {
      try {
        // Token var mı kontrol et
        if (!api.getToken()) {
          // Token yoksa login sayfasına yönlendir
          router.replace('/auth/login');
          return;
        }
        
        // Profil bilgilerini getir
        const profileData = await getProfileHook.request();
        if (profileData && profileData.role) {
          setUserRole(profileData.role);
        }
      } catch (error) {
        console.error('Kullanıcı rolü kontrol edilirken hata:', error);
        // Hata durumunda login sayfasına yönlendir
        router.replace('/auth/login');
      }
    };
    
    checkUserRole();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
          // Web için tab bar'ı gizle
          display: Platform.OS === 'web' ? 'none' : 'flex',
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          headerShown: Platform.OS === 'web' ? false : false,
        }}
      />
      {/* Mesajlar sekmesi daha sonra eklenecek
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble-ellipses" size={24} color={color} />,
        }}
      />
      */}
    </Tabs>
  );
}
