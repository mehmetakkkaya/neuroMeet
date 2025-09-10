import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function PendingApprovalScreen() {

  const handleGoToHome = () => {
    // Kullanıcıyı rol seçimi veya login ekranına yönlendirebiliriz.
    // Kullanıcıyı login ekranına yönlendir.
    router.replace('/auth/login'); 
  };

  return (
    <>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#E2D1F9', '#FFFFFF']} // Signup ile benzer bir gradient
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="hourglass-outline" size={80} color="#8B5CF6" style={styles.icon} />
            <Text style={styles.title}>Başvurunuz Alındı!</Text>
            <Text style={styles.message}>
              Terapistlik başvurunuz başarıyla alınmıştır. Hesabınız en kısa sürede
              incelenecek ve onay durumu hakkında e-posta ile bilgilendirileceksiniz.
            </Text>
            <Text style={styles.message}>
              Sabrınız için teşekkür ederiz.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleGoToHome}>
              <Text style={styles.buttonText}>Anladım</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Hafif transparan beyaz arka plan
    borderRadius: 20,
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
