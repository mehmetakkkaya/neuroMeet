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
import { Stack, router, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetProfile } from '../../../src/hooks/useApi';
import api from '../../../src/services/api';
import { CustomerUser } from '../../../src/types/api.types';
import RatingModal from '../../components/RatingModal';
import WebRatingModal from '../../components/WebRatingModal';

// Ekran boyutları
const { width, height } = Dimensions.get('window');

// Stil tipleri için arayüz
interface CustomerProfileStyles {
  // Mobil & Ortak
  container: ViewStyle;
  loadingContainer: ViewStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  retryButton: ViewStyle;
  retryButtonText: TextStyle;
  headerGradient: ViewStyle;
  headerContent: ViewStyle;
  backButton: ViewStyle;
  headerTitle: TextStyle;
  editButton: ViewStyle;
  editButtonText: TextStyle;
  profileImageContainer: ViewStyle;
  profileImage: any; // ImageStyle | object for web?
  name: TextStyle;
  joinDate: TextStyle;
  statsContainer: ViewStyle;
  statItem: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  statDivider: ViewStyle;
  scrollView: ViewStyle;
  scrollContent: ViewStyle;
  sectionContainer: ViewStyle;
  sectionTitle: TextStyle;
  infoRow: ViewStyle;
  iconContainer: ViewStyle;
  infoContent: ViewStyle;
  infoLabel: TextStyle;
  infoValue: TextStyle;
  statusBadge: ViewStyle;
  statusText: TextStyle;
  actionsContainer: ViewStyle;
  actionButton: ViewStyle;
  actionIcon: TextStyle; // Icon styles can be tricky, TextStyle often works
  actionText: TextStyle;
  logoutButton: ViewStyle;
  // Web Specific
  webContainer: ViewStyle;
  webBackgroundGradient: ViewStyle;
  webScrollContent: ViewStyle;
  webMaxContentWidth: ViewStyle;
  webProfileBanner: ViewStyle;
  webBannerImageContainer: ViewStyle;
  webProfileImageLarge: any;
  webProfileNameLarge: TextStyle;
  webProfileEmail: TextStyle;
  webBannerActions: ViewStyle;
  webEditButtonBanner: ViewStyle;
  webEditButtonText: TextStyle;
  webSectionCard: ViewStyle;
  webSectionTitle: TextStyle;
  webLogoutButton: ViewStyle;
  webLogoutButtonText: TextStyle;
  headerActionsMobile: ViewStyle;
  headerIconButtonMobile: ViewStyle;
  webProfileCardActions: ViewStyle;
  webTopBar: ViewStyle;
  webTopBarTitle: TextStyle;
  webProfileIcon: ViewStyle;
}

export default function CustomerProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const router = useRouter();
  
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
        
        if (profileData && profileData.role === 'customer') {
          setCustomer(profileData as CustomerUser);
        } else {
          setError('Müşteri profili bulunamadı.');
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
  
  // Yeni randevu oluşturma işlevi
  const handleCreateAppointment = () => {
    Alert.alert(
      "Randevu Oluştur",
      "Bu işlev henüz uygulanmadı. Randevu oluşturma sayfası geliştirme aşamasındadır.",
      [
        { text: "Tamam", style: "default" }
      ]
    );
  };
  
  // Çıkış yapma işlevi
  const handleLogout = () => {
    console.log("Çıkış yapma işlemi başlatıldı...");
    try {
      // Token'ı temizle
      api.clearToken();
      console.log("Token temizlendi.");
      
      // Yönlendirme: Web için tam sayfa yenilemesi, mobil için replace
      if (Platform.OS === 'web') {
        // Tam sayfa yenilemesi ile login sayfasına git
        window.location.href = '/auth/login'; 
        // Bu satırdan sonrası çalışmayabilir çünkü sayfa yenilenecek
        console.log("Login sayfasına web yenilemesi ile yönlendirildi."); 
      } else {
        // Mobil için normal yönlendirme
        router.replace('/auth/login');
        console.log("Login sayfasına mobil yönlendirmesi ile yönlendirildi.");
      }

    } catch (error) {
       console.error("Çıkış sırasında hata:", error);
       Alert.alert("Hata", "Çıkış yapılırken bir sorun oluştu.");
    }
    // Alert'li kod hala yorumda
  };

  // Yeni: Değerlendirme modalını açma fonksiyonu
  const handleOpenRatingModal = () => {
    if (!customer?.id) {
        Alert.alert('Hata', 'Modal açmak için kullanıcı bilgisi bulunamadı.');
        return;
    }
    console.log("Geçmiş Randevularım modalı açılıyor...");
    setIsRatingModalVisible(true);
  };

  // --- Bileşen Render Fonksiyonları ---

  // Mobil: Üst Kısım (Gradient Header, Profil Foto, İsim, İstatistikler)
  const renderMobileHeader = () => (
    <LinearGradient
      colors={['#6366F1', '#9D6FF0']}
      style={styles.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        {/* Sağ Üst Butonlar (Mobil) */}
        <View style={styles.headerActionsMobile}>
          <TouchableOpacity
            style={styles.headerIconButtonMobile} // Edit ikonu
            onPress={handleEditProfile}
          >
             <FontAwesome name="pencil" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButtonMobile} // Logout ikonu
            onPress={handleLogout}             
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.profileImageContainer}>
        <Image
          source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
          style={styles.profileImage}
        />
      </View>
      <Text style={styles.name}>{customer!.name}</Text>
      <Text style={styles.joinDate}>NeuroMeet üyesi: {formatDate(customer!.createdAt)}</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Tamamlanan</Text>
        </View>
        <View style={styles.statDivider}></View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Yaklaşan</Text>
        </View>
      </View>
    </LinearGradient>
  );

  // Profil Bölümleri (renderProfileSections - isWeb parametresi eklendi)
  const renderProfileSections = (isWeb = false) => (
    <>
      {/* İletişim bilgileri */}
      <View style={[styles.sectionContainer, isWeb && styles.webSectionCard]}>
        <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>İletişim Bilgileri</Text>
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={20} color="#9D6FF0" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>E-posta</Text>
            <Text style={styles.infoValue}>{customer!.email}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="call-outline" size={20} color="#9D6FF0" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Telefon</Text>
            <Text style={styles.infoValue}>{customer!.phone || '-'}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="location-outline" size={20} color="#9D6FF0" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Adres</Text>
            <Text style={styles.infoValue}>{customer!.address || '-'}</Text>
          </View>
        </View>
      </View>

      {/* Kişisel bilgiler */}
      <View style={[styles.sectionContainer, isWeb && styles.webSectionCard]}>
        <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>Kişisel Bilgiler</Text>
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar-outline" size={20} color="#9D6FF0" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Doğum Tarihi</Text>
            <Text style={styles.infoValue}>{customer!.dateOfBirth ? formatDate(customer!.dateOfBirth) : '-'}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-outline" size={20} color="#9D6FF0" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Cinsiyet</Text>
            <Text style={styles.infoValue}>{customer!.gender || '-'}</Text>
          </View>
        </View>
      </View>

      {/* Hesap Durumu */}
      <View style={[styles.sectionContainer, isWeb && styles.webSectionCard]}>
        <Text style={[styles.sectionTitle, isWeb && styles.webSectionTitle]}>Hesap Durumu</Text>
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#9D6FF0" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Durum</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {customer!.status === 'active' ? 'Aktif' :
                 customer!.status === 'pending' ? 'Onay Bekliyor' :
                 customer!.status === 'suspended' ? 'Askıya Alınmış' : 'Pasif'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="time-outline" size={20} color="#9D6FF0" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Kayıt Tarihi</Text>
            <Text style={styles.infoValue}>{formatDate(customer!.createdAt)}</Text>
          </View>
        </View>
      </View>
    </>
  );

  // Ortak Çıkış Butonu
  const renderLogoutButton = () => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        styles.logoutButton,
        Platform.OS === 'web' && styles.webLogoutButton
      ]}
      onPress={handleLogout}
    >
      <Ionicons 
        name="log-out-outline" 
        size={Platform.OS === 'web' ? 16 : 20} 
        color={Platform.OS === 'web' ? '#DC2626' : '#fff'} 
        style={styles.actionIcon} 
      />
      <Text style={[
         styles.actionText, 
         Platform.OS === 'web' && styles.webLogoutButtonText
       ]}>Çıkış Yap</Text>
    </TouchableOpacity>
  );

  // --- Ana Layout Render Fonksiyonları ---

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
        {/* Mobil actionsContainer kaldırıldı, buton header'a taşındı */}
        {/* YENİ: Geçmiş Randevularım Butonu (Mobil) */}
        <TouchableOpacity 
           style={[styles.actionButton, {backgroundColor: '#FF9800'}]} // Farklı renk örnek
           onPress={handleOpenRatingModal} 
        >
          <Ionicons name="star-half-outline" size={20} color="white" style={styles.actionIcon} />
          <Text style={styles.actionText}>Geçmiş Randevularım</Text>
        </TouchableOpacity>
        {/* Çıkış Butonu Mobil Header'da */}
      </ScrollView>
    </SafeAreaView>
  );

  // Web Layout (renderWebLayout - Yeniden Tasarlandı)
  const renderWebLayout = () => (
    <LinearGradient
      colors={['#A78BFA', '#D8B4FE', '#F5F3FF']} 
      style={styles.webBackgroundGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* --- Web Üst Barı --- */}
      <View style={styles.webTopBar}>
        <TouchableOpacity onPress={() => router.push('/')}> 
          <Text style={styles.webTopBarTitle}>NeuroMeet</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}> 
          <Ionicons name="person-circle" size={32} color="white" style={styles.webProfileIcon} />
        </TouchableOpacity>
      </View>
      {/* --- Bitiş: Web Üst Barı --- */}

      <View style={styles.webContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={styles.webScrollContent}>
          <View style={styles.webMaxContentWidth}>

            {/* YENİ KONUM: Geçmiş Randevularım Butonu (Web) */}
            <TouchableOpacity 
               style={[styles.actionButton, {backgroundColor: '#FF9800', alignSelf: 'flex-start', marginBottom: 25 }]} // marginTop kaldırıldı, marginBottom eklendi
               onPress={handleOpenRatingModal} 
            >
              <Ionicons name="star-half-outline" size={20} color="white" style={styles.actionIcon} />
              <Text style={styles.actionText}>Geçmiş Randevularım</Text>
            </TouchableOpacity>

            {/* --- YENİ: Web Banner Alanı --- */}
            <View style={styles.webProfileBanner}>
              <View style={styles.webBannerImageContainer}>
                <Image
                  source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} // Placeholder
                  style={styles.webProfileImageLarge} 
                />
              </View>
              <Text style={styles.webProfileNameLarge}>{customer!.name}</Text>
              <Text style={styles.webProfileEmail}>{customer!.email}</Text>
              <View style={styles.webBannerActions}>
                <TouchableOpacity
                  style={styles.webEditButtonBanner} 
                  onPress={handleEditProfile}
                >
                  <FontAwesome name="pencil" size={16} color="#6366F1" style={{ marginRight: 8 }}/>
                  <Text style={styles.webEditButtonText}>Profili Düzenle</Text>
                </TouchableOpacity>
                 {renderLogoutButton()} {/* Logout butonu banner'a taşındı */}
              </View>
            </View>
            {/* --- Bitiş: Web Banner Alanı --- */}
            
            {/* Profil Bölümleri (isWeb=true parametresi ile çağrılıyor) */}
            {renderProfileSections(true)} 
            
            {/* Çıkış Butonu Web Banner'da */} 
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );

  // --- Yükleme ve Hata Durumları (Ortak) ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9D6FF0" />
      </View>
    );
  }
  
  if (error || !customer) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>{error || 'Müşteri profili bulunamadı.'}</Text>
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
  const profileImage = 'https://randomuser.me/api/portraits/men/32.jpg';

  // --- Ana Render ---
  const renderRatingModal = () => {
    if (!customer?.id) return null;

    if (Platform.OS === 'web') {
      return (
        <WebRatingModal
          isVisible={isRatingModalVisible}
          onClose={() => setIsRatingModalVisible(false)}
          userId={customer.id}
        />
      );
    }
    return (
      <RatingModal
        isVisible={isRatingModalVisible}
        onClose={() => setIsRatingModalVisible(false)}
        userId={customer.id}
      />
    );
  };

  return (
    <>
      {Platform.select({
        web: renderWebLayout(),
        default: renderMobileLayout(),
      })}
      {renderRatingModal()} 
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f8fa',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f8fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
  },
  name: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  joinDate: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    marginHorizontal: 30,
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 40,
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(157, 111, 240, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  actionsContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B', // Mobil için arka plan rengi
    // Diğer stiller actionButton'dan miras alınır
    // Web görünümü için webLogoutButton kullanılır
  },
  statusBadge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  webContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 75,
  },
  webBackgroundGradient: {
    flex: 1,
  },
  webScrollContent: {
    paddingTop: 40, 
    paddingBottom: 60, 
    paddingHorizontal: '5%',
    alignItems: 'center',
    flexGrow: 1,
  },
  webMaxContentWidth: {
    width: '100%',
    maxWidth: 1000, 
  },
  webProfileBanner: { 
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 30,
    marginBottom: 40,
    alignItems: 'center',
    // Gölge stilleri eklenebilir (Platform.select ile)
    elevation: 5,
  },
  webBannerImageContainer: {
    marginBottom: 15,
  },
  webProfileImageLarge: { 
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: '#E5E7EB',
  },
  webProfileNameLarge: { 
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  webProfileEmail: { 
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 25,
  },
  webBannerActions: { 
      flexDirection: 'row',
      alignItems: 'center', // Butonları aynı hizada tutmak için
      // gap: 15, // RN desteklemez, margin kullanılacak
      marginTop: 10,
  },
  webEditButtonBanner: { 
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E0E7FF',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginRight: 15, // Logout butonundan ayırmak için
  },
  webEditButtonText: { // Bu stil zaten vardı, doğrulandı
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  webSectionCard: { // Web için bölüm kartı stili
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30, 
    marginBottom: 30, 
    // Gölge stilleri eklenebilir
    elevation: 3,
  },
  webSectionTitle: { // Web için bölüm başlığı stili
    fontSize: 22, 
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 25, 
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webLogoutButton: {
    // backgroundColor kaldırıldı, kenarlık eklendi
    borderColor: '#DC2626',
    borderWidth: 1,
    paddingVertical: 8, // Edit butonu ile aynı yükseklik
    paddingHorizontal: 14, // Edit butonu ile benzer padding
    width: 'auto',
    // alignSelf kaldırıldı, flex container içinde
    flexDirection: 'row', // İkon ve metin için
    alignItems: 'center', // İkon ve metin için
    // Gölge kaldırıldı veya isteğe bağlı olarak azaltılabilir
    shadowOpacity: 0,
    elevation: 0,
    borderRadius: 20, // Edit butonu ile aynı yuvarlaklık
    backgroundColor: 'transparent', // Arka planı şeffaf yap
  },
  webLogoutButtonText: { // Web çıkış yap butonu metin stili
    color: '#DC2626', // Kırmızı metin
    fontSize: 14,      // Edit butonu ile aynı font boyutu
    fontWeight: '600', // Edit butonu ile aynı kalınlık
  },
  headerActionsMobile: {
    flexDirection: 'row',
  },
  headerIconButtonMobile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8, // Butonlar arası boşluk
  },
  webProfileCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
}); 