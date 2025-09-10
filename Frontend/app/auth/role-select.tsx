import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';

type UserRole = 'customer' | 'therapist';

export default function RoleSelectScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleContinue = () => {
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role to continue.');
      return;
    }

    // Navigate to signup page with selected role
    router.push({
      pathname: '/auth/signup',
      params: { role: selectedRole }
    });
  };

  // ---- Ortak Role Card Component'i ----
  const RoleCard = ({ role, title, description, videoSource, iconName }: any) => (
    <TouchableOpacity 
      style={[styles.roleCard, selectedRole === role && styles.selectedCard, Platform.OS === 'web' && styles.webRoleCard ]}
      onPress={() => setSelectedRole(role)}
    >
      <View style={styles.videoContainer}>
        <Video
          style={styles.video}
          source={videoSource}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={selectedRole === role}
          isMuted={true}
        />
        <View style={[styles.iconCircle, selectedRole === role && styles.selectedIconCircle]}>
          <Ionicons 
            name={iconName} 
            size={Platform.OS === 'web' ? 36 : 48} // Web'de ikon biraz daha küçük
            color={selectedRole === role ? '#FFF' : '#666'} 
          />
        </View>
      </View>
      <Text style={styles.roleTitle}>{title}</Text>
      <Text style={styles.roleDescription}>{description}</Text>
    </TouchableOpacity>
  );

  // ---- Mobil Görünüm ----
  const renderMobileLayout = () => (
    <>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#C9B6F7', '#F0EBFC']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>NeuroMeet'e Katıl</Text>
            <Text style={styles.subtitle}>Rolünü Seç</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoText}>Zaten hesabın var mı? </Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>Giriş Yap</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Mobil Role Cards */}
            <View style={styles.roleContainer}>
              <RoleCard 
                 role="customer"
                 title="MÜŞTERİ"
                 description="Terapi hizmeti arayan bir danışan olarak katılın"
                 videoSource={require('../../assets/videos/customer-video.mp4.mp4')}
                 iconName="person"
                  />
              <RoleCard 
                 role="therapist"
                 title="TERAPİST"
                 description="Terapi hizmeti sunan bir profesyonel olarak katılın"
                 videoSource={require('../../assets/videos/therapist-video.mp4.mp4')}
                 iconName="medkit"
              />
            </View>

            <TouchableOpacity 
              style={[styles.continueButton, !selectedRole && styles.disabledButton]}
              onPress={handleContinue}
              disabled={!selectedRole}
            >
              <Text style={styles.continueButtonText}>Devam Et</Text>
              <Ionicons name="arrow-forward-circle" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );

  // ---- Web Görünümü ----
  const renderWebLayout = () => (
     <>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#8B5CF6', '#C4B5FD', '#F5F3FF']} // Login'deki gradient
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }} // Soldan sağa
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.webContainer}> 
          <View style={styles.webCenterContent}>
              <Text style={styles.webTitle}>NeuroMeet'e Katıl</Text>
              <Text style={styles.webSubtitle}>Lütfen rolünüzü seçin</Text>
              <View style={styles.webInfoTextContainer}>
                <Text style={styles.infoText}>Zaten hesabın var mı? </Text>
                <Link href="/auth/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.loginLink}>Giriş Yap</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              {/* Web Role Cards (yan yana) */}
              <View style={styles.webRoleContainer}>
                <RoleCard 
                  role="customer"
                  title="MÜŞTERİ"
                  description="Terapi hizmeti arayan bir danışan olarak katılın"
                  videoSource={require('../../assets/videos/customer-video.mp4.mp4')}
                  iconName="person"
                />
                <RoleCard 
                  role="therapist"
                  title="TERAPİST"
                  description="Terapi hizmeti sunan bir profesyonel olarak katılın"
                  videoSource={require('../../assets/videos/therapist-video.mp4.mp4')}
                  iconName="medkit"
                />
              </View>

              <TouchableOpacity 
                style={[styles.continueButton, styles.webContinueButton, !selectedRole && styles.disabledButton]}
                onPress={handleContinue}
                disabled={!selectedRole}
              >
                <Text style={styles.continueButtonText}>Devam Et</Text>
                <Ionicons name="arrow-forward-circle" size={20} color="white" />
              </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </>
  );

  // Platforma göre render et
  return Platform.select({
    web: renderWebLayout(),
    default: renderMobileLayout(),
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradient: {
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: 'space-between',
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 16,
    color: '#666',
    textAlign: 'center',
  },
  infoTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#A376F1',
    fontWeight: '500',
    marginLeft: 4,
  },
  roleContainer: {
    marginBottom: 40,
  },
  roleCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  selectedCard: {
    borderColor: '#A376F1',
    shadowOpacity: 0.2,
    elevation: 5,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    height: 120,
    marginBottom: 16,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 8,
    opacity: 0.7,
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    opacity: 0.7,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1,
  },
  selectedIconCircle: {
    backgroundColor: '#A376F1',
    borderColor: '#A376F1',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#A376F1',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignSelf: 'stretch',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  webContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webCenterContent: {
    width: '100%',
    maxWidth: 900,
    alignItems: 'center',
  },
  webTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1F2937',
    textAlign: 'center',
  },
  webSubtitle: {
    fontSize: 22,
    fontWeight: '500',
    marginBottom: 20,
    color: '#4B5563',
    textAlign: 'center',
  },
  webInfoTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 50,
  },
  webRoleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 50,
    gap: 30,
  },
  webRoleCard: {
    flex: 1,
    maxWidth: 350,
    marginBottom: 0,
    padding: 20,
  },
  webContinueButton: {
    alignSelf: 'center',
    maxWidth: 300,
    paddingHorizontal: 50,
    borderRadius: 8,
  },
}); 