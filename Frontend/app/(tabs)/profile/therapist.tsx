import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert,
  ViewStyle,
  TextStyle
} from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetProfile } from '../../../src/hooks/useApi';
import api from '../../../src/services/api';
import { TherapistUser } from '../../../src/types/api.types';

// Ekran boyutları
const { width, height } = Dimensions.get('window');

// Stil tipleri için arayüz (Müşteri stiline benzer)
interface TherapistProfileStyles extends Record<string, ViewStyle | TextStyle | object> { }

export default function TherapistProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [therapist, setTherapist] = useState<TherapistUser | null>(null);
  
  // API hooks
  const getProfileHook = useGetProfile();
  
  // Profil bilgilerini yükleme
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
        
        if (profileData && profileData.role === 'therapist') {
          setTherapist(profileData as TherapistUser);
        } else {
          setError('Terapist profili bulunamadı.');
        }
      } catch (err) {
        console.error("Profil bilgileri yüklenirken hata:", err);
        setError('Profil bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  // Tarih formatı
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };
  
  // Profil düzenleme işlevi
  const handleEditProfile = () => {
    router.push('/profile/edit-profile');
  };
  
  // Çıkış yapma işlevi (Customer.tsx ile aynı)
  const handleLogout = () => {
    console.log("Çıkış yapma işlemi başlatıldı (Terapist)...");
    try {
      // Token'ı temizle
      api.clearToken();
      console.log("Token temizlendi (Terapist).");
      
      // Yönlendirme: Web için tam sayfa yenilemesi, mobil için replace
      if (Platform.OS === 'web') {
        // Tam sayfa yenilemesi ile login sayfasına git
        window.location.href = '/auth/login'; 
        console.log("Login sayfasına web yenilemesi ile yönlendirildi (Terapist)."); 
      } else {
        // Mobil için normal yönlendirme
        router.replace('/auth/login');
        console.log("Login sayfasına mobil yönlendirmesi ile yönlendirildi (Terapist).");
      }

    } catch (error) {
       console.error("Çıkış sırasında hata (Terapist):", error);
       Alert.alert("Hata", "Çıkış yapılırken bir sorun oluştu.");
    }
  };

  // Terapist ana sayfasına gitmek için
  const goToTherapistDashboard = () => {
    // Uyarı mesajı göster
    Alert.alert(
      "Terapist Ana Sayfası",
      "Terapist ana sayfasına gitmek istiyor musunuz?",
      [
        { 
          text: "İptal", 
          style: "cancel" 
        },
        { 
          text: "Tamam", 
          style: "default", 
          onPress: () => {
            // Ana sayfaya geri dön ve tekrar başlat
            router.replace('/');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9D6FF0" />
      </View>
    );
  }
  
  if (error || !therapist) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>{error || 'Terapist profili bulunamadı.'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => router.replace('/(tabs)/profile')}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Placeholder profilResmi
  const profileImage = 'https://randomuser.me/api/portraits/women/44.jpg';
  
  // Mobil: Üst Kısım (Header, Profil Foto, İsim vb.)
  const renderMobileHeader = () => (
    <LinearGradient
      colors={['#9D6FF0', '#6366F1']} // Renkler terapist temasına uygun olabilir
      style={styles.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.headerActionsMobile}>
          <TouchableOpacity style={styles.headerIconButtonMobile} onPress={handleEditProfile}>
            <FontAwesome name="pencil" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButtonMobile} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.profileImageContainer}>
        <Image source={{ uri: profileImage }} style={styles.profileImage} />
        <View style={styles.ratingBadge}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <Text style={styles.ratingText}>4.8</Text>
             <Ionicons name="star" size={12} color="#FFD700" style={{ marginLeft: 4 }} />
           </View>
        </View>
      </View>
      <Text style={styles.name}>{therapist.name}</Text>
      <Text style={styles.specialty}>{therapist.specialty || 'Uzman Terapist'}</Text>
      {/* Terapist istatistikleri eklenebilir (Müşterideki gibi) */}
      {/* <View style={styles.statsContainer}> ... </View> */}
    </LinearGradient>
  );

  // Ortak: Profil Bilgileri Bölümleri (Hakkında, İletişim, Kişisel, Profesyonel)
  const renderProfileSections = (isWeb = false) => (
    <>
      {/* Hakkında */}
      <View style={[styles.sectionContainer, isWeb && styles.webSectionCard]}>
        <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>Hakkında</Text>
        <Text style={styles.bioText}>{therapist.bio || 'Henüz bir biyografi eklenmemiş.'}</Text>
      </View>

      {/* İletişim bilgileri */}
      <View style={[styles.sectionContainer, isWeb && styles.webSectionCard]}>
        <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>İletişim Bilgileri</Text>
        {/* Info rows... */}
        <View style={styles.infoRow}>
            <View style={styles.iconContainer}><Ionicons name="mail-outline" size={20} color="#9D6FF0" /></View>
            <View style={styles.infoContent}><Text style={styles.infoLabel}>E-posta</Text><Text style={styles.infoValue}>{therapist.email}</Text></View>
        </View>
        <View style={styles.infoRow}>
             <View style={styles.iconContainer}><Ionicons name="call-outline" size={20} color="#9D6FF0" /></View>
            <View style={styles.infoContent}><Text style={styles.infoLabel}>Telefon</Text><Text style={styles.infoValue}>{therapist.phone || '-'}</Text></View>
        </View>
         <View style={styles.infoRow}>
             <View style={styles.iconContainer}><Ionicons name="location-outline" size={20} color="#9D6FF0" /></View>
            <View style={styles.infoContent}><Text style={styles.infoLabel}>Adres</Text><Text style={styles.infoValue}>{therapist.address || '-'}</Text></View>
        </View>
      </View>

      {/* Kişisel bilgiler */}
      <View style={[styles.sectionContainer, isWeb && styles.webSectionCard]}>
          <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>Kişisel Bilgiler</Text>
          <View style={styles.infoRow}>
               <View style={styles.iconContainer}><Ionicons name="calendar-outline" size={20} color="#9D6FF0" /></View>
               <View style={styles.infoContent}><Text style={styles.infoLabel}>Doğum Tarihi</Text><Text style={styles.infoValue}>{therapist.dateOfBirth ? formatDate(therapist.dateOfBirth) : '-'}</Text></View>
          </View>
          <View style={styles.infoRow}>
               <View style={styles.iconContainer}><Ionicons name="person-outline" size={20} color="#9D6FF0" /></View>
               <View style={styles.infoContent}><Text style={styles.infoLabel}>Cinsiyet</Text><Text style={styles.infoValue}>{therapist.gender || '-'}</Text></View>
          </View>
      </View>

      {/* Profesyonel bilgiler */}
      <View style={[styles.sectionContainer, isWeb && styles.webSectionCard]}>
        <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>Profesyonel Bilgiler</Text>
        {/* Info rows... */}
        <View style={styles.infoRow}>
            <View style={styles.iconContainer}><Ionicons name="school-outline" size={20} color="#9D6FF0" /></View>
            <View style={styles.infoContent}><Text style={styles.infoLabel}>Eğitim</Text><Text style={styles.infoValue}>{therapist.educationBackground || '-'}</Text></View>
        </View>
        <View style={styles.infoRow}>
             <View style={styles.iconContainer}><FontAwesome5 name="id-card" size={18} color="#9D6FF0" /></View>
            <View style={styles.infoContent}><Text style={styles.infoLabel}>Lisans Numarası</Text><Text style={styles.infoValue}>{therapist.licenseNumber || '-'}</Text></View>
        </View>
         <View style={styles.infoRow}>
            <View style={styles.iconContainer}><Ionicons name="time-outline" size={20} color="#9D6FF0" /></View>
            <View style={styles.infoContent}><Text style={styles.infoLabel}>Deneyim</Text><Text style={styles.infoValue}>{therapist.yearsOfExperience ? `${therapist.yearsOfExperience} yıl` : '-'}</Text></View>
        </View>
        {/* Yeni: Seans Ücreti Bilgisi */}
        <View style={styles.infoRow}>
            <View style={styles.iconContainer}><FontAwesome name="money" size={18} color="#9D6FF0" /></View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Seans Ücreti</Text>
                <Text style={styles.infoValue}>
                    {therapist.sessionFee !== null && therapist.sessionFee !== undefined 
                        ? `${therapist.sessionFee} TL` // Şimdilik TL ekleyelim
                        : 'Değer girilmemiş'
                    }
                </Text>
            </View>
        </View>
      </View>

      {/* Hesap Durumu */}
      <View style={[styles.sectionContainer, isWeb && styles.webSectionCard]}>
        <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>Hesap Durumu</Text>
         <View style={styles.infoRow}>
          <View style={styles.iconContainer}><Ionicons name="shield-checkmark-outline" size={20} color="#9D6FF0" /></View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Durum</Text>
            <View style={[
              styles.statusBadge,
              therapist.status === 'active' ? styles.statusActive :
              therapist.status === 'pending' ? styles.statusPending :
              therapist.status === 'suspended' ? styles.statusSuspended :
              styles.statusInactive
            ]}>
              <Text style={styles.statusText}>
                {therapist.status === 'active' ? 'Aktif' : 
                 therapist.status === 'pending' ? 'Onay Bekliyor' : 
                 therapist.status === 'suspended' ? 'Askıya Alınmış' : 'Pasif'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}><Ionicons name="time-outline" size={20} color="#9D6FF0" /></View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Kayıt Tarihi</Text>
            <Text style={styles.infoValue}>{formatDate(therapist.createdAt)}</Text>
          </View>
        </View>
      </View>
    </>
  );

  // Ortak: Çıkış Yap Butonu (Web için özel stil içerir)
  const renderLogoutButton = () => (
    <TouchableOpacity
      style={[
        // Platform.OS === 'web' ? null : styles.actionButton, // Mobil buton stili kaldırıldı
        styles.logoutButton, // Temel logout stilini uygula
        Platform.OS === 'web' && styles.webLogoutButton // Web özel stilini uygula
      ]}
      onPress={handleLogout}
    >
      <Ionicons 
        name="log-out-outline" 
        size={Platform.OS === 'web' ? 14 : 20} // Web ikonu biraz daha küçük
        color={Platform.OS === 'web' ? '#DC2626' : '#fff'} 
        style={styles.actionIcon} 
      />
      <Text style={[
         styles.actionText, // Temel metin stili
         Platform.OS === 'web' && styles.webLogoutButtonText // Web özel metin stili
       ]}>Çıkış Yap</Text>
    </TouchableOpacity>
  );

  // Mobil Layout
  const renderMobileLayout = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      <Stack.Screen options={{ headerShown: false }} />
      {renderMobileHeader()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileSections()}
        {/* Mobil Çıkış Yap Butonu (Artık renderLogoutButton kullanıyor) */}
        {renderLogoutButton()}
      </ScrollView>
    </SafeAreaView>
  );

  // Web Layout (Müşteri Stiline Benzer)
  const renderWebLayout = () => (
    <LinearGradient
      colors={['#A78BFA', '#D8B4FE', '#F5F3FF']} 
      style={styles.webBackgroundGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* --- YENİ: Web Üst Barı (index.tsx'ten alındı) --- */}
      <View style={styles.webTopBar}> 
            <TouchableOpacity onPress={() => router.push('/')}> 
              <Text style={styles.webTopBarTitle}>NeuroMeet</Text> 
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.navigate('/(tabs)/profile/therapist')}> 
                 {/* Rol kontrolü kaldırıldı, doğrudan terapist profiline git */}
               {/*
                 if (roleCode === ROLE_CODES.ADMIN) {
                   router.navigate('/(tabs)/profile/admin');
                 } else if (roleCode === ROLE_CODES.CUSTOMER) {
                   router.navigate('/(tabs)/profile/customer');
                 } else if (roleCode === ROLE_CODES.THERAPIST) {
                   router.navigate('/(tabs)/profile/therapist');
                 } else {
                   // Rol bilinmiyorsa veya hata varsa varsayılan profile git
                   router.navigate('/(tabs)/profile');
                 }
                */}
              <Ionicons name="person-circle-outline" size={32} color="white" style={styles.webProfileIcon} /> 
            </TouchableOpacity>
       </View>
      {/* --- Bitiş: Web Üst Barı --- */}

      <View style={styles.webContainer}>
        {/* Stack.Screen ayarları başlığı gizlemek için kaldırıldı */}
        {/* <Stack.Screen options={{ title: 'Profil', headerBackVisible: true, headerTitleAlign: 'center', headerStyle: { backgroundColor: 'transparent'}, headerShadowVisible: false }} /> */}
        <Stack.Screen options={{ headerShown: false }} /> {/* Başlığı tamamen gizle */} 
        
        {/* ScrollView'a paddingTop eklendi */}
        <ScrollView contentContainerStyle={styles.webScrollContent} style={{ paddingTop: 75 }}>
          <View style={styles.webMaxContentWidth}>
            {/* Web için Profil Kartı (Başlık kaldırıldı) */}
            {/* Mevcut webHeader kaldırılacak veya yorum satırı yapılacak */}
            <View style={styles.webProfileCard}>
              <Image source={{ uri: profileImage }} style={styles.webProfileImage} />
              <View style={styles.webProfileInfo}>
                <Text style={styles.webName}>{therapist.name}</Text>
                <Text style={styles.webEmail}>{therapist.email}</Text>
                 <Text style={styles.webSpecialty}>{therapist.specialty || 'Uzman Terapist'}</Text>
              </View>
              <View style={styles.webProfileCardActions}> 
                <TouchableOpacity style={styles.webEditButton} onPress={handleEditProfile}>
                  <FontAwesome name="pencil" size={14} color="#6366F1" style={{ marginRight: 6 }}/>
                  <Text style={styles.webEditButtonText}>Düzenle</Text>
                </TouchableOpacity>
                {/* Web için Çıkış Yap Butonu (renderLogoutButton ile) */} 
                {renderLogoutButton()}
              </View>
            </View>

            {renderProfileSections(true)} 
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );

  // --- Ana Render (Platforma Göre) ---
  return Platform.select({
    web: renderWebLayout(),
    default: renderMobileLayout(),
  });
}

// Stiller güncelleniyor (Explicit tip kaldırıldı)
const styles = StyleSheet.create({
  // --- Mobil & Ortak Stiller --- (Customer.tsx'den kopyalanıp uyarlandı)
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f8fa' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f8fa', padding: 20 },
  errorText: { fontSize: 16, color: '#555', textAlign: 'center', marginTop: 12, marginBottom: 24 },
  retryButton: { backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: '#9D6FF0' // Fallback color
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerActionsMobile: { flexDirection: 'row' },
  headerIconButtonMobile: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  profileImageContainer: { alignItems: 'center', marginBottom: 15, position: 'relative' },
  profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'white' },
  ratingBadge: {
    position: 'absolute',
    bottom: 0,
    right: width / 2 - 50, // Adjust positioning as needed
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingText: {
    fontWeight: '700',
    color: '#333',
    fontSize: 12,
  },
  name: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  specialty: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 16, textAlign: 'center', marginTop: 4 },
  scrollView: { flex: 1, backgroundColor: '#f7f8fa' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 40 },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 15 },
  bioText: { fontSize: 16, color: '#555', lineHeight: 24 },
  infoRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'center' },
  iconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(157, 111, 240, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  infoValue: { fontSize: 16, color: '#333' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, marginTop: 4 },
  statusActive: { backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#16A34A' }, // Renk eklendi
  statusPending: { backgroundColor: 'rgba(255, 204, 0, 0.1)', color: '#D97706' }, // Renk eklendi
  statusSuspended: { backgroundColor: 'rgba(255, 69, 58, 0.1)', color: '#DC2626' }, // Renk eklendi
  statusInactive: { backgroundColor: 'rgba(142, 142, 147, 0.1)', color: '#6B7280' }, // Renk eklendi
  statusText: { fontSize: 12, fontWeight: '600' }, // Color buradan kaldırıldı, üstteki stillere eklendi
  actionButton: { /* Mobil butonlar için temel stil (varsa) */ },
  actionIcon: { marginRight: 8 },
  actionText: { color: 'white', fontSize: 16, fontWeight: '600' },
  appointmentButton: { backgroundColor: '#9D6FF0', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }, // Yeni isim
  appointmentButtonText: { color: 'white', fontWeight: '700', fontSize: 16 }, // Yeni isim
  availabilityButton: { backgroundColor: '#6366F1' },
  logoutButton: { 
    backgroundColor: '#FF6B6B', // Mobil için kırmızı
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12, 
    flexDirection: 'row', // İkon için
    justifyContent: 'center' // İkon için
  }, 

  // --- Web Özel Stiller --- (Customer.tsx'den kopyalanıp uyarlandı)
  webContainer: { flex: 1, backgroundColor: 'transparent' },
  webBackgroundGradient: { flex: 1 },
  webScrollContent: { paddingVertical: 50, paddingHorizontal: '5%', alignItems: 'center', flexGrow: 1 },
  webMaxContentWidth: { width: '100%', maxWidth: 900, flex: 1, justifyContent: 'flex-start', flexDirection: 'column' },
  webProfileCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 25,
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  webProfileImage: { width: 80, height: 80, borderRadius: 40, marginRight: 20, borderWidth: 3, borderColor: '#E5E7EB' },
  webProfileInfo: { flex: 1, justifyContent: 'center' },
  webName: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  webEmail: { fontSize: 15, color: '#6B7280' },
  webSpecialty: { fontSize: 15, color: '#6366F1', marginTop: 4, fontWeight: '500' }, // Terapiste özel eklendi
  webProfileCardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, // customer.tsx'den eklendi
  webEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  webEditButtonText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  webSectionCard: { 
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 25,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  webSectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  webLogoutButton: { // Customer.tsx'den alındı
    borderColor: '#DC2626',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    width: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0,
    elevation: 0,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  webLogoutButtonText: { // Customer.tsx'den alındı
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },

  // --- index.tsx'ten Eklenen Web Top Bar Stilleri --- 
  webTopBar: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 75, 
    backgroundColor: '#6366F1', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40, 
    zIndex: 10, 
  },
  webTopBarTitle: { 
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  webProfileIcon: { 
    opacity: 0.9, 
  },
  // --- Bitiş: Eklenen Web Top Bar Stilleri --- 
}); 