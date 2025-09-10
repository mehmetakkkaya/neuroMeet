import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Platform, 
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useGetProfile, useListUserBookings, useListTherapistBookings, useGetTherapists } from '../../src/hooks/useApi';
import api from '../../src/services/api';
import { User, Meeting, TherapistUser } from '../../src/types/api.types';
import TherapistSelectionModal from '../components/TherapistSelectionModal';
import WebTherapistSearchModal from '../components/WebTherapistSearchModal'; // Yeni import

const { width, height } = Dimensions.get('window');

// Rol kodu sabitleri
const ROLE_CODES = {
  ADMIN: 0,
  CUSTOMER: 1,
  THERAPIST: 2
};

// Terapist öneri verisi
const suggestedTherapists: Partial<TherapistUser>[] = [
  {
    id: 1,
    name: 'Dr. Ayşe Yılmaz',
    specialty: 'Bilişsel Davranışçı Terapi',
    bio: '10 yıllık deneyimle anksiyete ve depresyon tedavisi konusunda uzmanlaşmıştır.',
  },
  {
    id: 2,
    name: 'Dr. Mehmet Kaya',
    specialty: 'Aile Terapisi',
    bio: 'Aile içi iletişim sorunları ve çift terapisi konusunda 8 yıllık deneyim.',
  },
  {
    id: 3,
    name: 'Dr. Zeynep Demir',
    specialty: 'Travma Terapisi',
    bio: 'Travma sonrası stres bozukluğu (TSSB) tedavisinde uzman.',
  }
];

// Yaklaşan randevu verileri
const upcomingAppointments: Partial<Meeting>[] = [
  {
    id: '101',
    title: 'Terapi Seansı',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Yarın
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    meetingType: 'video',
    status: 'scheduled',
    hostId: '1',
  },
  {
    id: '102',
    title: 'İlk Tanışma Görüşmesi',
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 gün sonra
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    meetingType: 'in-person',
    status: 'scheduled',
    hostId: '2',
  }
];

// Bildirim verileri
const notifications = [
  {
    id: '201',
    title: 'Yeni mesajınız var',
    message: 'Dr. Ayşe Yılmaz size yeni bir mesaj gönderdi',
    time: '30 dakika önce',
    isRead: false,
    type: 'message'
  },
  {
    id: '202',
    title: 'Randevu hatırlatması',
    message: 'Yarınki terapi seansınız için hatırlatma',
    time: '1 saat önce',
    isRead: true,
    type: 'appointment'
  }
];

// Kalan Zaman Hesaplama Fonksiyonu
const calculateRemainingTime = (bookingDate: string, startTime: string): string => {
  if (!bookingDate || !startTime) return '';

  try {
    const datePart = bookingDate.split(' ')[0];
    const bookingStartDateTime = new Date(`${datePart}T${startTime}`);
    if (isNaN(bookingStartDateTime.getTime())) return ''; // Geçersiz tarih

    const now = new Date();
    const diff = bookingStartDateTime.getTime() - now.getTime();

    if (diff <= 0) {
      return ''; // Geçmiş veya şimdiki zaman
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 1) {
      return `${days} gün kaldı!`;
    } else if (days === 1) {
      return `Yarın ${hours > 0 ? `(${hours} sa)`: ''}`;
    } else if (hours > 0) {
      return `${hours} sa ${minutes > 0 ? `${minutes} dk`: ''} kaldı!`;
    } else if (minutes > 0) {
      return `${minutes} dk kaldı!`;
    } else {
      return 'Şimdi başlıyor!';
    }
  } catch (e) {
    console.error("Zaman hesaplama hatası:", e);
    return ''; 
  }
};

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [roleCode, setRoleCode] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [therapistBookings, setTherapistBookings] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<Partial<TherapistUser>[]>([]);
  const [isTherapistModalVisible, setIsTherapistModalVisible] = useState(false);
  const [isWebSearchModalVisible, setIsWebSearchModalVisible] = useState(false); // Web modal için YENİ STATE
  
  // API hooks
  const getProfileHook = useGetProfile();
  const listUserBookingsHook = useListUserBookings();
  const listTherapistBookingsHook = useListTherapistBookings();
  const getTherapistsHook = useGetTherapists();
  
  // Kullanıcı profil bilgilerini yükle
  useEffect(() => {
    loadUserData();
  }, []);
  
  // Kullanıcı rolüne göre kod ataması yapan fonksiyon
  const assignRoleCode = (role: string): number => {
    switch (role) {
      case 'admin':
        return ROLE_CODES.ADMIN;
      case 'therapist':
        return ROLE_CODES.THERAPIST;
      case 'customer':
      default:
        return ROLE_CODES.CUSTOMER;
    }
  };
  
  // API'den veri yükleme
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Token kontrolü
      if (!api.getToken()) {
        console.log('Token bulunamadı, login sayfasına yönlendiriliyor...');
        router.replace('/auth/login');
        return;
      }
      
      // Kullanıcı profil bilgilerini getir
      const profileData = await getProfileHook.request();
      
      if (profileData) {
        setUser(profileData);
        
        // Kullanıcı rolüne göre kod ataması yap
        const code = assignRoleCode(profileData.role);
        setRoleCode(code);
        console.log(`Kullanıcı rolü: ${profileData.role}, Kod: ${code}`);
        
        // Rol bazlı veri yükleme
        if (profileData.role === 'customer') {
          // --- Müşteri Booking Yükleme --- 
          try {
            console.log(`Booking'ler isteniyor (Kullanıcı ID: ${profileData.id})...`);
            const bookingsResponse = await listUserBookingsHook.request(profileData.id);
            console.log("Gelen Booking Yanıtı (Ham):", JSON.stringify(bookingsResponse, null, 2));

            if (Array.isArray(bookingsResponse)) {
              // Gelecek tarihteki ve iptal edilmemiş/tamamlanmamışları filtrele
            const now = new Date();
              const upcomingBookings = bookingsResponse.filter((booking: any) => {
                if (!booking || !booking.bookingDate || !booking.startTime) return false;
                const datePart = booking.bookingDate.split(' ')[0]; 
                const bookingStartDateTime = new Date(`${datePart}T${booking.startTime}`);
                if (isNaN(bookingStartDateTime.getTime())) return false;
                return bookingStartDateTime >= now && 
                       booking.status !== 'cancelled' && 
                       booking.status !== 'completed';
              });
              console.log("Filtrelenmiş Yaklaşan Booking'ler:", JSON.stringify(upcomingBookings, null, 2));
            
            // Başlangıç zamanına göre sırala
              upcomingBookings.sort((a: any, b: any) => {
                if (!a || !b || !a.bookingDate || !b.bookingDate || !a.startTime || !b.startTime) return 0;
                const aDateTime = new Date(`${a.bookingDate.split(' ')[0]}T${a.startTime}`);
                const bDateTime = new Date(`${b.bookingDate.split(' ')[0]}T${b.startTime}`);
                return aDateTime.getTime() - bDateTime.getTime();
              });
              
              // appointments state'ini booking verisiyle güncelle
              setAppointments(upcomingBookings.map(booking => {
                // Orijinal booking objesini koru, sadece title ve host ekle/güncelle
                return {
                  ...booking, 
                  id: booking.id.toString(), 
                  title: booking.therapist?.name || 'Randevu', 
                  host: booking.therapist // Terapist bilgisi host altına
                  // bookingDate ve startTime orijinal haliyle kalacak
                };
              })); 
            } else {
               console.log("Booking API yanıtı beklenen formatta değil veya boş.");
               setAppointments([]);
            }
          } catch (bookingsError) {
            console.error('Bookings yüklenirken hata:', bookingsError);
            setAppointments([]);
        }
          // --- Bitiş: Müşteri Booking Yükleme ---

          // --- Müşteri Terapist Listesi Yükleme ---
          try {
            const therapistsResponse = await getTherapistsHook.request({});
            console.log("Gelen Terapistler Yanıtı (limitsiz):", JSON.stringify(therapistsResponse, null, 2));
             // API yanıtının yapısını kontrol et (doğrudan dizi mi, obje mi?)
            const therapistsArray = Array.isArray(therapistsResponse) ? therapistsResponse : therapistsResponse?.users || [];
            setTherapists(therapistsArray.filter((u:any) => u.role === 'therapist'));
        } catch (therapistsError) {
          console.error('Terapistler yüklenirken hata:', therapistsError);
          setTherapists([]);
        }
           // --- Bitiş: Müşteri Terapist Listesi Yükleme ---

        } else if (profileData.role === 'therapist') {
          // --- Terapist Booking Yükleme (YENİ) ---
          try {
            console.log(`Terapist Booking'leri isteniyor (Terapist ID: ${profileData.id})...`);
            const therapistBookingsResponse = await listTherapistBookingsHook.request(profileData.id);
            console.log("Gelen Terapist Booking Yanıtı (Ham):", JSON.stringify(therapistBookingsResponse, null, 2));

            if (Array.isArray(therapistBookingsResponse)) {
               // Gelecek tarihteki ve iptal edilmemiş/tamamlanmamışları filtrele
              const now = new Date();
              const upcomingTherapistBookings = therapistBookingsResponse.filter((booking: any) => {
                if (!booking || !booking.bookingDate || !booking.startTime) return false;
                const datePart = booking.bookingDate.split(' ')[0]; 
                const bookingStartDateTime = new Date(`${datePart}T${booking.startTime}`);
                if (isNaN(bookingStartDateTime.getTime())) return false;
                return bookingStartDateTime >= now && 
                       booking.status !== 'cancelled' && 
                       booking.status !== 'completed';
              });
              console.log("Filtrelenmiş Yaklaşan Terapist Booking'ler:", JSON.stringify(upcomingTherapistBookings, null, 2));
              
              // Başlangıç zamanına göre sırala
              upcomingTherapistBookings.sort((a: any, b: any) => {
                if (!a || !b || !a.bookingDate || !b.bookingDate || !a.startTime || !b.startTime) return 0;
                const aDateTime = new Date(`${a.bookingDate.split(' ')[0]}T${a.startTime}`);
                const bDateTime = new Date(`${b.bookingDate.split(' ')[0]}T${b.startTime}`);
                return aDateTime.getTime() - bDateTime.getTime();
              });

              // therapistBookings state'ini güncelle
              setTherapistBookings(upcomingTherapistBookings);
            } else {
              console.log("Terapist Booking API yanıtı beklenen formatta değil veya boş.");
              setTherapistBookings([]);
            }
          } catch (therapistBookingsError) {
            console.error('Therapist Bookings yüklenirken hata:', therapistBookingsError);
            setTherapistBookings([]);
          }
          // --- Bitiş: Terapist Booking Yükleme ---
        } 
        // else if (profileData.role === 'admin') { ... }
      }
    } catch (err) {
      console.error("Kullanıcı bilgileri yüklenirken hata:", err);
      setError('Kullanıcı bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Tarih formatlama (parse düzeltildi)
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Tarih Yok';
    const datePart = dateString.split(' ')[0]; 
    const date = new Date(datePart); 
    if (isNaN(date.getTime())) { 
      console.warn('formatDate - Geçersiz tarih:', dateString);
      return 'Hata'; 
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Date objesinin saatini sıfırlayarak karşılaştırma
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                    
    const isToday = compareDate.getTime() === today.getTime();
    const isTomorrow = compareDate.getTime() === tomorrow.getTime();
    
    if (isToday) {
      return 'Bugün';
    } else if (isTomorrow) {
      return 'Yarın';
    } else {
      // Ay bilgisini 1 artır
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
  };
  
  // Saat formatlama (parse düzeltildi)
  const formatTime = (timeString: string | undefined | null) => {
    if (!timeString) return '--:--';
    if (typeof timeString === 'string' && timeString.includes(':')) {
      return timeString.substring(0, 5); // HH:mm
    }
    console.warn('formatTime - Geçersiz saat:', timeString);
    return '--:--';
  };
  
  // Yenileme işlemi
  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };
  
  // Randevu tipine göre ikon getir
  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Ionicons name="videocam" size={18} color="#6366F1" />;
      case 'audio':
        return <Ionicons name="call" size={18} color="#6366F1" />;
      case 'in-person':
        return <Ionicons name="person" size={18} color="#6366F1" />;
      default:
        return <Ionicons name="calendar" size={18} color="#6366F1" />;
    }
  };
  
  // Çıkış yapma işlevi (Customer/Therapist ile aynı)
  const handleLogout = () => {
    console.log("Çıkış yapma işlemi başlatıldı (Index)..." );
    try {
      api.clearToken();
      console.log("Token temizlendi (Index).");
      if (Platform.OS === 'web') {
        window.location.href = '/auth/login'; 
        console.log("Login sayfasına web yenilemesi ile yönlendirildi (Index)."); 
      } else {
        router.replace('/auth/login');
        console.log("Login sayfasına mobil yönlendirmesi ile yönlendirildi (Index).");
      }
    } catch (error) {
       console.error("Çıkış sırasında hata (Index):", error);
       Alert.alert("Hata", "Çıkış yapılırken bir sorun oluştu.");
    }
  };
  
  // Yükleme ekranı
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }
  
  // Hata ekranı
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/profile/therapist-availability')}
        >
          <Text style={styles.actionButtonText}>Müsaitlik Zamanlarını Düzenle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Mobil Görünüm ----
  const renderMobileLayout = () => (
     <>
       <StatusBar style="light" />
       <View style={styles.container}> 
         {/* Mobil Başlık ve Profil */}
         <LinearGradient
           colors={['#6366F1', '#9D6FF0']}
           style={styles.header}
           start={{ x: 0, y: 0 }}
           end={{ x: 1, y: 1 }}
         >
           <View style={styles.topBar}>
             <View>
               <Text style={styles.greeting}>Merhaba,</Text>
               <Text style={styles.userName}>{user?.name || 'Misafir'}</Text>
               <Text style={styles.userRole}>
                 {roleCode === ROLE_CODES.ADMIN ? 'Yönetici' : 
                  roleCode === ROLE_CODES.THERAPIST ? 'Terapist' : 'Kullanıcı'}
               </Text>
             </View>
             <TouchableOpacity 
               style={styles.profileButton}
               onPress={() => {
                  // Doğrudan rol bazlı profil sayfasına git
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
                }}
             >
               <View style={styles.profileImageContainer}>
                 <Image 
                   source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
                   style={styles.profileImage} 
                 />
                 <View style={styles.notificationBadge}>
                   <Text style={styles.notificationCount}>2</Text>
                 </View>
               </View>
             </TouchableOpacity>
           </View>
         </LinearGradient>
         
         {/* Mobil Rol Bazlı İçerik */}
         {roleCode === ROLE_CODES.ADMIN ? renderAdminContent(handleLogout) :
          roleCode === ROLE_CODES.THERAPIST ? renderTherapistContent() :
          renderCustomerContent()}
       </View>
       {/* Mobil Modal (renderCustomerContent içinde tetiklenir)*/}
       {roleCode === ROLE_CODES.CUSTOMER && (
          <TherapistSelectionModal 
            visible={isTherapistModalVisible} 
            onClose={() => setIsTherapistModalVisible(false)}
          />
      )}
     </>
   );

  // ---- Web Görünümü ----
  const renderWebLayout = () => {
    let WebContentComponent;
    // handleLogout'u burada da props olarak geçmek gerekebilir
    const commonProps = { handleLogout }; 

    switch (roleCode) {
      case ROLE_CODES.ADMIN:
        WebContentComponent = () => renderAdminContent(handleLogout); // handleLogout prop olarak geçildi
        break;
      case ROLE_CODES.THERAPIST:
        WebContentComponent = renderWebTherapistContent; 
        break;
      case ROLE_CODES.CUSTOMER:
      default:
        WebContentComponent = renderWebCustomerContent; 
        break;
    }

    return (
      <LinearGradient 
          colors={['#A78BFA', '#D8B4FE', '#F5F3FF']} 
          style={styles.webBackgroundGradient} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 0, y: 1 }}
      >
          {/* --- Web Üst Barı --- */}
          <View style={styles.webTopBar}>
            {/* NeuroMeet Logosu Tıklanabilir Hale Getirildi */}
            <TouchableOpacity onPress={() => router.push('/')}> {/* Hedef / olarak değiştirildi */}
              <Text style={styles.webTopBarTitle}>NeuroMeet</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
                 // Doğrudan rol bazlı profil sayfasına git (Web)
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
               }}>
              <Ionicons name="person-circle-outline" size={32} color="white" style={styles.webProfileIcon} />
            </TouchableOpacity>
          </View>
          {/* --- Bitiş: Web Üst Barı --- */}

          <View style={styles.webContainer}> 
            {/* Web için hangi içeriğin gösterileceğine karar ver */}
            {roleCode === ROLE_CODES.ADMIN ? renderAdminContent(handleLogout) : // Eski Admin içeriği
             roleCode === ROLE_CODES.THERAPIST ? renderWebTherapistContent() : // ESKİ: renderTherapistContent() --> YENİ: renderWebTherapistContent()
             renderWebCustomerContent() // YENİ Web Müşteri içeriği
            }
          </View>

           {/* --- Web Mesajlar FAB --- */}
          <TouchableOpacity 
            style={styles.webMessagesFAB} 
            onPress={() => Alert.alert("Mesajlar", "Mesajlaşma özelliği yakında eklenecek.")}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="white" />
          </TouchableOpacity>
          {/* --- Bitiş: Mesajlar FAB --- */}

          {/* --- Web Terapist Arama Modalı (YENİ) --- */}
          {roleCode === ROLE_CODES.CUSTOMER && (
              <WebTherapistSearchModal 
                visible={isWebSearchModalVisible} 
                onClose={() => setIsWebSearchModalVisible(false)}
              />
            )}
            {/* --- Bitiş: Web Terapist Arama Modalı --- */}

      </LinearGradient>
    );
  };

  // ---- Rol Bazlı İçerik Render Fonksiyonları ----
  const renderAdminContent = (logoutHandler: () => void) => { // logoutHandler prop olarak alındı
    return (
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      >
        <View style={styles.adminPanel}>
          <Text style={styles.adminPanelTitle}>Yönetici Kontrol Paneli</Text>
          
          <View style={styles.adminStatsContainer}>
            <View style={styles.adminStatCard}>
              <View style={styles.adminStatIconContainer}>
                <Ionicons name="people" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.adminStatValue}>
                {therapists.length || 0}
              </Text>
              <Text style={styles.adminStatLabel}>Terapistler</Text>
            </View>
            
            <View style={styles.adminStatCard}>
              <View style={styles.adminStatIconContainer}>
                <Ionicons name="person" size={24} color="#10B981" />
              </View>
              <Text style={styles.adminStatValue}>
                {12} {/* Placeholder */}
              </Text>
              <Text style={styles.adminStatLabel}>Kullanıcılar</Text>
            </View>
            
            <View style={styles.adminStatCard}>
              <View style={styles.adminStatIconContainer}>
                <Ionicons name="calendar" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.adminStatValue}>
                {appointments.length || 0}
              </Text>
              <Text style={styles.adminStatLabel}>Seanslar</Text>
            </View>
          </View>
          
          <View style={styles.adminActionCards}>
            <TouchableOpacity 
              style={styles.adminActionCard}
              onPress={() => router.push('/(tabs)/pending-therapists')}
            >
              <View style={styles.adminActionIconContainer}>
                <Ionicons name="checkmark-circle" size={28} color="#3B82F6" />
              </View>
              <View style={styles.adminActionContent}>
                <Text style={styles.adminActionTitle}>Terapist Onayları</Text>
                <Text style={styles.adminActionDescription}>Bekleyen terapist onay isteklerini yönetin</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.adminActionCard}
              onPress={() => Alert.alert("Kullanıcı Yönetimi", "Bu özellik henüz geliştirme aşamasındadır.")}
            >
              <View style={styles.adminActionIconContainer}>
                <Ionicons name="people" size={28} color="#10B981" />
              </View>
              <View style={styles.adminActionContent}>
                <Text style={styles.adminActionTitle}>Kullanıcı Yönetimi</Text>
                <Text style={styles.adminActionDescription}>Kullanıcı hesaplarını yönetin</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.adminActionCard}
              onPress={() => Alert.alert("Raporlar", "Bu özellik henüz geliştirme aşamasındadır.")}
            >
              <View style={styles.adminActionIconContainer}>
                <Ionicons name="bar-chart" size={28} color="#F59E0B" />
              </View>
              <View style={styles.adminActionContent}>
                <Text style={styles.adminActionTitle}>Raporlar</Text>
                <Text style={styles.adminActionDescription}>Kullanım istatistiklerini ve raporlarını görüntüleyin</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.adminActionCard}
              onPress={() => Alert.alert("Sistem Ayarları", "Bu özellik henüz geliştirme aşamasındadır.")}
            >
              <View style={styles.adminActionIconContainer}>
                <Ionicons name="settings" size={28} color="#6B7280" />
              </View>
              <View style={styles.adminActionContent}>
                <Text style={styles.adminActionTitle}>Sistem Ayarları</Text>
                <Text style={styles.adminActionDescription}>Uygulama ayarlarını yapılandırın</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Çıkış Yap Butonu (Admin) */}
          <TouchableOpacity 
            style={[styles.logoutButton, Platform.OS === 'web' && styles.webLogoutButton]} 
            onPress={logoutHandler} // Prop olarak gelen fonksiyon kullanıldı
          >
            <Ionicons 
              name="log-out-outline" 
              size={Platform.OS === 'web' ? 16 : 20} 
              color={Platform.OS === 'web' ? '#DC2626' : '#fff'} 
              style={styles.actionIcon} 
            />
            <Text style={[styles.actionText, Platform.OS === 'web' && styles.webLogoutButtonText]}>
              Çıkış Yap
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    );
  };

  const renderTherapistContent = () => {
    return (
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      >
        {/* Terapist için Hızlı Erişim Butonları (YENİ) */}
        <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.replace('/(tabs)/therapist-availability')} // Yönlendirme yolu güncellendi
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="calendar-outline" size={24} color="#6366F1" />
              </View>
              <Text style={styles.quickActionText}>Müsaitlik</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => Alert.alert("Mesajlar", "Mesajlaşma özelliği henüz geliştirme aşamasındadır.")}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="chatbubbles-outline" size={24} color="#6366F1" />
              </View>
              <Text style={styles.quickActionText}>Mesajlar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/(tabs)/profile')} // Profil sayfasına git
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="person-outline" size={24} color="#6366F1" />
              </View>
              <Text style={styles.quickActionText}>Profilim</Text>
            </TouchableOpacity>
             {/* İsteğe bağlı başka kısayollar eklenebilir */}
        </View>

        {/* Durum kartları */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, {backgroundColor: "#E0F2F1"}]}>
              <MaterialIcons name="people-outline" size={24} color="#009688" />
            </View>
            <Text style={styles.statValue}>{15}</Text> {/* Placeholder */}
            <Text style={styles.statLabel}>Danışan</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, {backgroundColor: "#FFF8E1"}]}>
              <MaterialIcons name="event-available" size={24} color="#FFA000" />
            </View>
            <Text style={styles.statValue}>{appointments.length}</Text>
            <Text style={styles.statLabel}>Yaklaşan Seans</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, {backgroundColor: "#E8EAF6"}]}>
              <MaterialIcons name="message" size={24} color="#3F51B5" />
            </View>
            <Text style={styles.statValue}>{2}</Text> {/* Placeholder */}
            <Text style={styles.statLabel}>Mesaj</Text>
          </View>
        </View>
        
        {/* Yaklaşan seanslar */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Yaklaşan Randevularınız</Text>
            <TouchableOpacity 
              onPress={() => Alert.alert("Bilgi", "Tüm randevuları görüntüleme özelliği yakında eklenecek.")}
            >
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          
          {therapistBookings.length > 0 ? (
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {therapistBookings.map((booking, index) => (
                <TouchableOpacity 
                  key={booking.id} 
                  style={styles.therapistBookingCard}
                  onPress={() => Alert.alert("Randevu Detayı", "Toplantı detaylarını görüntüleme özelliği yakında eklenecek.")}
                >
                  {/* Kalan Zaman Bilgisi */}
                  <Text style={styles.remainingTimeText}>
                    {calculateRemainingTime(booking.bookingDate, booking.startTime)}
                  </Text>
                <Image 
                    source={{ uri: booking.user?.profilePicture || `https://i.pravatar.cc/100?u=${booking.user?.id || index}`}} 
                    style={styles.clientImageSmall}
                  />
                  <View style={styles.therapistBookingInfo}>
                    <Text style={styles.clientNameSmall} numberOfLines={1}>{booking.user?.name || 'Müşteri'}</Text>
                    <Text style={styles.bookingTimeSmall}>
                      {booking.bookingDate ? formatDate(booking.bookingDate.split(' ')[0]) : ''} - {booking.startTime ? booking.startTime.substring(0,5) : ''}
                    </Text>
                    <View style={styles.bookingTypeSmallContainer}>
                       {booking.sessionType && getMeetingTypeIcon(booking.sessionType)}
                       <Text style={styles.bookingTypeSmallText}>
                         {booking.sessionType === 'video' ? 'Video' : 
                          booking.sessionType === 'audio' ? 'Sesli' : 
                          booking.sessionType === 'in-person' ? 'Yüz Yüze' : 'Görüşme'}
                       </Text>
                </View>
              </View>
            </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="calendar-outline" size={48} color="#DDD" />
              <Text style={styles.emptyStateText}>Yaklaşan randevunuz bulunmuyor</Text>
          </View>
          )}
        </View>
        
        {/* Müsaitlik Zamanları */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Müsaitlik Zamanlarınız</Text>
          </View>
          
          <View style={styles.availabilityInfo}>
            <MaterialIcons name="access-time" size={22} color="#6366F1" />
            <Text style={styles.availabilityText}>
              Müsaitlik zamanlarınızı düzenleyerek danışanlarınıza uygun randevu saatlerinizi gösterebilirsiniz.
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/profile/therapist-availability')}
          >
            <Text style={styles.actionButtonText}>Müsaitlik Zamanlarını Düzenle</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };
        
  // Normal kullanıcı içeriği (mevcut içerik)
  const renderCustomerContent = () => {
    return (
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
        >
        {/* Mevcut homescreen içeriği */}
          {/* Hızlı Erişim Butonları */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setIsTherapistModalVisible(true)}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="add-circle" size={24} color="#6366F1" />
              </View>
              <Text style={styles.quickActionText}>Yeni Randevu</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => Alert.alert("Mesajlar", "Mesajlaşma özelliği henüz geliştirme aşamasındadır.")}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="chatbubbles" size={24} color="#6366F1" />
              </View>
              <Text style={styles.quickActionText}>Mesajlar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="person" size={24} color="#6366F1" />
              </View>
              <Text style={styles.quickActionText}>Profilim</Text>
            </TouchableOpacity>
          </View>
          
          {/* Yaklaşan Randevular */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Yaklaşan Randevular</Text>
              <TouchableOpacity onPress={() => Alert.alert("Randevular", "Randevu listesi henüz geliştirme aşamasındadır.")}>
                <Text style={styles.seeAllText}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            
            {appointments.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {appointments.map((appointment, index) => (
                  <TouchableOpacity 
                    key={appointment.id} 
                    style={styles.therapistBookingCard}
                    onPress={() => Alert.alert("Randevu Detayı", "Randevu detay sayfası henüz geliştirme aşamasındadır.")}
                    activeOpacity={0.7}
                  >
                    {/* Kalan Zaman */}
                    <Text style={styles.remainingTimeText}>
                      {calculateRemainingTime(appointment.bookingDate, appointment.startTime)}
                      </Text>
                    {/* Terapist Resmi */}
                    <Image 
                      source={{ uri: appointment.host?.profilePicture || `https://i.pravatar.cc/100?u=${appointment.host?.id || index}`}} 
                      style={styles.clientImageSmall}
                    />
                    {/* Terapist ve Randevu Bilgileri */}
                    <View style={styles.therapistBookingInfo}> 
                      <Text style={styles.clientNameSmall} numberOfLines={1}>{appointment.host?.name || 'Terapist'}</Text>
                      <Text style={styles.bookingTimeSmall}>
                        {appointment.bookingDate ? formatDate(appointment.bookingDate) : ''} - {appointment.startTime ? formatTime(appointment.startTime) : ''}
                      </Text>
                      <View style={styles.bookingTypeSmallContainer}>
                         {appointment.sessionType && getMeetingTypeIcon(appointment.sessionType)} 
                         <Text style={styles.bookingTypeSmallText}>
                           {appointment.sessionType === 'video' ? 'Video' : 
                            appointment.sessionType === 'audio' ? 'Sesli' : 
                            appointment.sessionType === 'in-person' ? 'Yüz Yüze' : 'Görüşme'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="calendar-outline" size={48} color="#DDD" />
                <Text style={styles.emptyStateText}>Henüz randevu almadınız</Text>
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => router.push('/booking')}
                >
                  <Text style={styles.emptyStateButtonText}>Randevu Oluştur</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Önerilen Terapistler */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Önerilen Terapistler</Text>
              <TouchableOpacity onPress={() => setIsTherapistModalVisible(true)}> {/* Mobil modalı açar */}
                <Text style={styles.seeAllText}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            
            {therapists.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.therapistsScrollContent}
              >
                {therapists.map((therapist, index) => (
                  <TouchableOpacity 
                    key={therapist.id} 
                    style={styles.therapistCard}
                  >
        <Image
                      source={{ uri: `https://randomuser.me/api/portraits/${index % 2 ? 'women' : 'men'}/${index + 30}.jpg` }} 
                      style={styles.therapistImage} 
                    />
                    <Text style={styles.therapistName}>{therapist.name}</Text>
                    <Text style={styles.therapistSpecialty}>{therapist.specialty || 'Genel Terapist'}</Text>
                    <Text numberOfLines={2} style={styles.therapistBio}>
                      {therapist.bio || 'Terapist hakkında bilgi bulunmuyor.'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.bookButton}
                      onPress={() => {
                        if (therapist && therapist.id) {
                          const params = {
                            therapistId: therapist.id.toString(), 
                            therapistName: therapist.name || 'Terapist',
                            therapistSpecialty: therapist.specialty || 'Uzman',
                          };
                          console.log("Booking sayfasına yönlendiriliyor, params:", params);
                          router.push({ pathname: '/booking', params });
                        } else {
                          console.error("Tıklanan terapistin ID'si bulunamadı.");
                          Alert.alert("Hata", "Terapist bilgileri eksik.");
                        }
                      }}
                    >
                      <Text style={styles.bookButtonText}>Randevu Al</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="people-outline" size={48} color="#DDD" />
                <Text style={styles.emptyStateText}>Şu anda aktif terapist bulunmuyor</Text>
              </View>
            )}
          </View>
        </ScrollView>
    );
  };

  // YENİ: Web Müşteri İçeriği
  const renderWebCustomerContent = () => {
    return (
      <ScrollView contentContainerStyle={styles.webScrollContent}>
        <View style={styles.webMaxContentWidth}>
          {/* Üst Karşılama/Hero Alanı (Web) */}
          <View style={styles.webHeroSection}>
            <Text style={styles.webGreeting}>Tekrar Hoş Geldin, {user?.name || 'Misafir'}!</Text>
            <Text style={styles.webSubtitle}>Randevularını yönet veya yeni terapistler keşfet.</Text>
          </View>

          {/* Hızlı Aksiyonlar (Web - Ortalanmış Yeni Randevu) */}
          <View style={styles.webQuickActionsContainer}>
             <TouchableOpacity 
              style={[styles.webActionButton, styles.webNewAppointmentButton]} // Yeni/Güncel stiller
              onPress={() => setIsWebSearchModalVisible(true)} // WEB MODALINI AÇAR
            >
              <Ionicons name="add-circle-outline" size={20} color="white" style={{ marginRight: 10 }}/>
              <Text style={styles.webActionText}>Yeni Randevu Al</Text>
            </TouchableOpacity>
            {/* Diğer hızlı aksiyonlar buraya eklenebilir */}
          </View>

          {/* Yaklaşan Randevular (Web) */}
          <View style={styles.webSectionContainer}>
            <Text style={styles.webSectionTitle}>Yaklaşan Randevular</Text>
            {appointments.length > 0 ? (
              <View style={styles.webAppointmentsGrid}>
                {appointments.map((appointment, index) => (
                   <TouchableOpacity 
                    key={appointment.id} 
                    style={styles.webAppointmentCard} // Web için yeni kart stili
                    onPress={() => Alert.alert('Detay Sayfası', 'Randevu detay sayfası henüz tam entegre değil.')} // Geçici Alert
                  >
                     <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                        <Image 
                           source={{ uri: appointment.host?.profilePicture || `https://i.pravatar.cc/100?u=${appointment.host?.id || index}`}} 
                           style={styles.webTherapistImageSmall}
                        />
                        <View style={{marginLeft: 10, flex: 1}}>
                            <Text style={styles.webCardTitle} numberOfLines={1}>{appointment.host?.name || 'Terapist'}</Text>
                            <Text style={styles.webCardSubtitle}>{appointment.host?.specialty || 'Uzman'}</Text>
                        </View>
                         {/* Kalan Zaman */}
                        <Text style={styles.webRemainingTimeText}>
                           {calculateRemainingTime(appointment.bookingDate, appointment.startTime)}
                        </Text>
                     </View>
                     <View style={styles.webCardBody}>
                        <Text style={styles.webCardText}>Tarih: {appointment.bookingDate ? formatDate(appointment.bookingDate) : '-'}</Text>
                        <Text style={styles.webCardText}>Saat: {appointment.startTime ? formatTime(appointment.startTime) : '-'}</Text>
                     </View>
                     <View style={styles.webCardFooter}>
                         {getMeetingTypeIcon(appointment.sessionType || '')}
                         <Text style={styles.webCardFooterText}>
                             {appointment.sessionType === 'video' ? 'Video Görüşme' : 
                              appointment.sessionType === 'audio' ? 'Sesli Görüşme' : 
                              appointment.sessionType === 'in-person' ? 'Yüz Yüze' : 'Görüşme'}
                         </Text>
                     </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.webEmptyState}>
                 <Ionicons name="calendar-outline" size={40} color="#ccc" />
                <Text style={styles.webEmptyStateText}>Yaklaşan randevunuz bulunmuyor.</Text>
              </View>
            )}
          </View>

          {/* Önerilen Terapistler (Web) */}
          <View style={styles.webSectionContainer}>
            <Text style={styles.webSectionTitle}>Önerilen Terapistler</Text>
             {therapists.length > 0 ? (
                <View style={styles.webTherapistGrid}> 
                    {therapists.slice(0, 4).map((therapist, index) => ( // İlk 4 terapisti gösterelim
                        <TouchableOpacity 
                            key={therapist.id} 
                            style={styles.webTherapistCard} // Web için yeni kart stili
                             onPress={() => { /* Terapist detay veya booking sayfasına yönlendirme */ 
                                if (therapist && therapist.id) {
                                    router.push({ pathname: '/booking', params: { 
                                        therapistId: therapist.id.toString(), 
                                        therapistName: therapist.name || 'Terapist',
                                        therapistSpecialty: therapist.specialty || 'Uzman',
                                    } });
                                } else { Alert.alert("Hata", "Terapist bilgileri eksik."); }
                              }}
                        >
                             <Image
                                source={{ uri: `https://randomuser.me/api/portraits/${index % 2 ? 'women' : 'men'}/${index + 30}.jpg` }}
                                style={styles.webTherapistImageLarge}
                            />
                            <Text style={styles.webCardTitle}>{therapist.name}</Text>
                            <Text style={styles.webCardSubtitle}>{therapist.specialty || 'Genel Terapist'}</Text>
                            <Text style={styles.webTherapistBio} numberOfLines={2}>{therapist.bio || 'Terapist hakkında kısa bilgi...'}</Text> {/* Bio eklendi */}
                            {/* Randevu Al Butonu Eklendi */}
                            <TouchableOpacity 
                                style={styles.webCardBookButton} 
                                onPress={() => { 
                                    if (therapist && therapist.id) {
                                        router.push({ pathname: '/booking', params: { 
                                            therapistId: therapist.id.toString(), 
                                            therapistName: therapist.name || 'Terapist',
                                            therapistSpecialty: therapist.specialty || 'Uzman',
                                        } });
                                    } else { Alert.alert("Hata", "Terapist bilgileri eksik."); }
                                }}
                            >
                                <Text style={styles.webCardBookButtonText}>Randevu Al</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>
             ) : (
                 <View style={styles.webEmptyState}>
                     <Ionicons name="people-outline" size={40} color="#ccc" />
                    <Text style={styles.webEmptyStateText}>Aktif terapist bulunmuyor.</Text>
                </View>
             )}
            {/* Tüm terapistleri görme butonu eklenebilir */}
          </View>

        </View>
      </ScrollView>
    );
  };

  // YENİ: Web Terapist İçeriği
  const renderWebTherapistContent = () => {
    // Şimdilik mobil içeriği temel alalım, sonra web'e özel düzenleyelim
    return (
      <ScrollView contentContainerStyle={styles.webScrollContent}>
        <View style={styles.webMaxContentWidth}>
          {/* Üst Karşılama Alanı (Web Terapist) */}
          <View style={styles.webHeroSection}>
            <Text style={styles.webGreeting}>Merhaba Terapist, {user?.name || ''}!</Text>
            <Text style={styles.webSubtitle}>Bugünkü randevularınızı ve danışanlarınızı yönetin.</Text>
          </View>

          {/* Hızlı Erişim Butonları (Web Terapist - Grid yapısı olabilir) */}
          {/* KALDIRILDI
          <View style={styles.webTherapistQuickActionsGrid}>
             <TouchableOpacity
              style={styles.webTherapistQuickActionButton}
              onPress={() => router.push('/(tabs)/profile/therapist-availability')}
            >
              <Ionicons name="calendar-outline" size={28} color="#6366F1" />
              <Text style={styles.webTherapistQuickActionText}>Müsaitlik Ayarla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.webTherapistQuickActionButton}
              onPress={() => Alert.alert("Mesajlar", "Mesajlaşma özelliği yakında...")}
            >
              <Ionicons name="chatbubbles-outline" size={28} color="#6366F1" />
              <Text style={styles.webTherapistQuickActionText}>Mesajlar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.webTherapistQuickActionButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="person-outline" size={28} color="#6366F1" />
              <Text style={styles.webTherapistQuickActionText}>Profilim</Text>
            </TouchableOpacity>
          </View>
          */}

          

          
            {/* --- İki Sütunlu Alan Başlangıcı --- */}
            <View style={styles.webColumnsContainer}>
              {/* --- Sol Sütun: Yaklaşan Randevular --- */}
              <View style={styles.webLeftColumn}>
                {/* Yaklaşan Randevular (Web Terapist - Liste/Grid) */}
                <View style={styles.webSectionContainer}>
                  <Text style={styles.webSectionTitle}>Yaklaşan Randevularınız</Text>
                  {therapistBookings.length > 0 ? (
                    <View style={styles.webTherapistAppointmentsList}>
                      {therapistBookings.map((booking, index) => (
                        <TouchableOpacity
                          key={booking.id}
                          style={styles.webTherapistAppointmentCard} // Web için yeni kart stili
                          onPress={() => Alert.alert("Randevu Detayı", "Web randevu detayı yakında...")}
                        >
                           {/* Danışan Resmi ve Adı */}
                          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                              <Image
                                 source={{ uri: booking.user?.profilePicture || `https://i.pravatar.cc/100?u=${booking.user?.id || index}`}}
                                 style={styles.webTherapistClientImageSmall}
                              />
                              <View style={{marginLeft: 12, flex: 1}}>
                                  <Text style={styles.webCardTitle} numberOfLines={1}>{booking.user?.name || 'Danışan'}</Text>
                                   {/* Kalan Zaman (daha belirgin) */}
                                   <Text style={styles.webTherapistRemainingTime}>
                                      {calculateRemainingTime(booking.bookingDate, booking.startTime)}
                                   </Text>
                              </View>
                          </View>
                          {/* Randevu Detayları */}
                           <View style={styles.webCardBody}>
                              <View style={styles.webTherapistDetailRow}>
                                  <Ionicons name="calendar-clear-outline" size={16} color="#555" />
                                  <Text style={styles.webCardText}>Tarih: {booking.bookingDate ? formatDate(booking.bookingDate) : '-'}</Text>
                              </View>
                              <View style={styles.webTherapistDetailRow}>
                                  <Ionicons name="time-outline" size={16} color="#555" />
                                  <Text style={styles.webCardText}>Saat: {booking.startTime ? formatTime(booking.startTime) : '-'}</Text>
                              </View>
                          </View>
                          {/* Görüşme Tipi */}
                           <View style={styles.webCardFooter}>
                               {getMeetingTypeIcon(booking.sessionType || '')}
                               <Text style={styles.webCardFooterText}>
                                   {booking.sessionType === 'video' ? 'Video' :
                                    booking.sessionType === 'audio' ? 'Sesli' :
                                    booking.sessionType === 'in-person' ? 'Yüz Yüze' : 'Görüşme'}
                               </Text>
                           </View>
                            {/* Eylem Butonları (Opsiyonel: Katıl, İptal vb.) */}
                           {/* <View style={styles.webTherapistCardActions}> ... </View> */}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.webEmptyState}>
                      <Ionicons name="calendar-outline" size={40} color="#ccc" />
                      <Text style={styles.webEmptyStateText}>Yaklaşan randevunuz bulunmuyor.</Text>
                      {/* Müsaitlik ayarlama butonu eklenebilir */}
                       <TouchableOpacity
                          style={[styles.webActionButton, {marginTop: 15, backgroundColor: '#A78BFA'}]} // Farklı renk
                          onPress={() => router.push('/(tabs)/profile/therapist-availability')}
                          >
                          <Text style={[styles.webActionText, { color: '#6366F1' }]}>Düzenle</Text> 
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
              {/* --- Bitiş: Sol Sütun --- */}

              {/* --- Sağ Sütun: Müsaitlik ve Diğerleri --- */}
              <View style={styles.webRightColumn}>
                {/* Müsaitlik Yönetimi Kartı (Web Terapist) */}
                <View style={styles.webSectionContainer}> 
                   {/* Başlık isteğe bağlı eklenebilir */}
                   {/* <Text style={styles.webSectionTitle}>Müsaitlik</Text> */}
                   <Text style={styles.webSectionTitle}>Müsaitlik Zamanlarınız</Text> {/* BAŞLIK EKLENDİ */}
                   <View style={styles.webAvailabilityCard}>
                        <Ionicons name="time-outline" size={32} color="#6366F1" style={{marginRight: 15}}/>
                        <View style={{flex: 1}}>
                            <Text style={styles.webCardTitle}>Müsaitlik Zamanlarınız</Text>
                            <Text style={styles.webCardSubtitle}>Danışanların randevu alabileceği zamanları buradan yönetin.</Text>
                        </View>
                        <TouchableOpacity
    style={[styles.webActionButton, { paddingVertical: 10, paddingHorizontal: 20, marginLeft: 15 }]} // Mevcut stil
    onPress={() => router.push('/(tabs)/profile/therapist-availability')} // <-- BU SATIRI EKLE
    >
    <Text style={[styles.webActionText, { color: '#6366F1' }]}>Düzenle</Text>
</TouchableOpacity>
                    </View>
                </View>

                {/* Danışanlar Listesi (Opsiyonel - Basit hali) - Sağ Sütuna Taşındı */}
                <View style={styles.webSectionContainer}>
                    <Text style={styles.webSectionTitle}>Danışanlarınız</Text>
                    {/* Burada basit bir liste veya grid gösterilebilir */}
                     <View style={styles.webEmptyState}>
                         <Ionicons name="people-outline" size={40} color="#ccc" />
                        <Text style={styles.webEmptyStateText}>Danışan listesi özelliği yakında...</Text>
                    </View>
                </View>
              </View>
               {/* --- Bitiş: Sağ Sütun --- */}
            </View>
             {/* --- İki Sütunlu Alan Bitişi --- */}

        </View>
      </ScrollView>
    );
  };

  // Ana return ifadesi: Platforma göre layout seçimi
  return Platform.select({
    web: renderWebLayout(),
    default: renderMobileLayout(),
  });
}

const styles = StyleSheet.create({
  // --- Genel Stiller (Mobil & Web Ortak) ---
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 25,
    // Web için bu stil override edilebilir
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 30,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 150, // Boş durumda da yer kaplasın
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 15,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 10, 
  },
  therapistBookingCard: { // Hem müşteri hem terapist (mobil ağırlıklı)
    backgroundColor: 'white',
    borderRadius: 14, 
    padding: 15, 
    marginRight: 15, 
    width: Platform.select({ web: 256, default: width * 0.7 }), // Web için daraltıldı
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.12, 
    shadowRadius: 8, 
    elevation: 5, 
    position: 'relative',
    minHeight: 150, 
    borderWidth: 1, 
    borderColor: '#F3F4F6', 
  },
  remainingTimeText: {
    position: 'absolute',
    top: 10, 
    right: 10, 
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    color: '#6366F1',
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8,
    fontSize: 11, 
    fontWeight: 'bold',
    zIndex: 1,
  },
  clientImageSmall: { // Terapist görünümündeki danışan resmi
    width: 45,
    height: 45,
    borderRadius: 22.5,
    alignSelf: 'flex-start',
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  therapistBookingInfo: { // Terapist/Müşteri randevu kartı bilgi alanı
    flex: 1,
  },
  clientNameSmall: { // Terapist görünümündeki danışan adı
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
   bookingTimeSmall: { // Terapist/Müşteri randevu kartı zamanı
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
   bookingTypeSmallContainer: { // Terapist/Müşteri randevu kartı tipi
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.8, 
  },
   bookingTypeSmallText: { // Terapist/Müşteri randevu kartı tipi yazısı
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  therapistsScrollContent: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  therapistCard: { // Önerilen terapistler kartı
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginRight: 10,
    width: 200, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 7,
  },
  therapistImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
  },
  therapistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  therapistSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  therapistBio: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
    height: 36, // 2 satır için yaklaşık yükseklik
  },
  bookButton: {
    backgroundColor: '#6366F1',
    borderRadius: 20,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 'auto', // Kartın altına iter
  },
  bookButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  availabilityInfo: { // Terapist ana sayfası müsaitlik bilgisi
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  availabilityText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  actionButton: { // Genel eylem butonu (Müsaitlik düzenle vb.)
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  // --- Mobil Özel Stiller ---
  container: { // Mobil için ana sarmalayıcı
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: { // Mobil header gradient
    paddingTop: Platform.OS === 'ios' ? 60 : 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topBar: { // Mobil üst bar
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userRole: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: { // Mobil ScrollView
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: { // Mobil ScrollView içeriği
    paddingTop: 30,
    paddingBottom: 30,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  quickActionButton: {
    alignItems: 'center',
  },
  quickActionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 7,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  // ... (Diğer mobil stiller: admin, terapist paneli vb.) ...

  // --- Web'e Özel Stiller (YENİ BÖLÜM - Stiller buraya eklenecek) ---
  // NOT: display: 'grid', gridTemplateColumns, gap gibi CSS Grid özellikleri
  // doğrudan React Native StyleSheet'te çalışmaz. Bunlar Platform.select veya
  // web'e özel CSS dosyaları ile yönetilmelidir. Şimdilik flexbox temelli yaklaşımlar varsayılabilir.
  webContainer: { 
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 60, // Üst bar için boşluk
  },
  webBackgroundGradient: { 
      flex: 1,
  },
   webTopBar: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 75, // Yükseklik artırıldı
    backgroundColor: '#6366F1', 
    flexDirection: 'row',
    alignItems: 'center', // Dikeyde ortalama
    justifyContent: 'space-between',
    paddingHorizontal: 40, // Padding artırıldı
    zIndex: 10, 
    // boxShadow: '0 2px 5px rgba(0,0,0,0.15)', // Yorum satırı
  },
  webTopBarTitle: { 
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  webProfileIcon: { 
    opacity: 0.9, 
  },
  webMessagesFAB: { 
    // position: 'absolute', // RN'de web'de farklı çalışabilir, container ile yönetilebilir
    // bottom: 40,
    // right: 40,
    position: Platform.OS === 'web' ? 'fixed' : 'absolute', // Web için fixed deneyelim
    bottom: Platform.OS === 'web' ? 40 : 30,
    right: Platform.OS === 'web' ? 40 : 30,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#8B5CF6', 
    justifyContent: 'center',
    alignItems: 'center',
    // shadow stilleri RN ve Web için farklı olabilir
    elevation: 10,
    zIndex: 20,
  },
  webScrollContent: {
    paddingVertical: 40, 
    paddingHorizontal: '5%', 
    alignItems: 'center',
    flexGrow: 1,
  },
  webMaxContentWidth: { 
    width: '100%',
    maxWidth: 1200, 
  },
  webHeroSection: {
    width: '100%',
    padding: 40,
    marginBottom: 40,
    borderRadius: 12, 
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    // textAlign: 'center', // View'da text align yok, Text component'lerinde kullanılır
    alignItems: 'center', // İçeriği ortalamak için
  },
  webGreeting: {
    fontSize: 32, 
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  webSubtitle: {
    fontSize: 18,
    color: '#4B5563',
    textAlign: 'center',
  },
  webQuickActionsContainer: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center', 
      marginBottom: 40,
      // gap: 25, // gap RN'de her zaman desteklenmez, margin ile yönetilebilir
  },
  webActionButton: { 
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // shadow stilleri web'de farklı olabilir
    elevation: 5,
    marginHorizontal: 10, // gap yerine
  },
  webNewAppointmentButton: { 
      backgroundColor: '#8B5CF6', 
  },
   webActionText: { 
    color: 'white',
    fontSize: 16, 
    fontWeight: '600',
  },
  webSectionContainer: {
      width: '100%',
      marginBottom: 40,
  },
  webSectionTitle: {
      fontSize: 24, 
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: 20,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB', 
  },
  webAppointmentsGrid: {
      // display: 'grid', // RN desteklemez
      // gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      // gap: '25px', 
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-around', // veya 'flex-start'
      marginHorizontal: -12.5, // Kartlar arası boşluk için negatif margin
  },
   webAppointmentCard: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 20,
      elevation: 4,
      // transition: 'transform 0.2s ease-in-out', // Yorum satırı
      // cursor: 'pointer', // Yorum satırı
      width: Platform.select({ 
        // web: 'calc(50% - 25px)', // Hesaplama RN'de doğrudan çalışmaz, % veya flex kullanılabilir
        web: '48%', // % veya flex tabanlı yaklaşım
        default: '100%',
      }), 
      marginBottom: 25, 
      marginHorizontal: '1%', // % veya flex tabanlı yaklaşım
  },
  webTherapistImageSmall: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#eee',
  },
   webCardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1F2937',
  },
  webCardSubtitle: {
      fontSize: 14,
      color: '#6B7280',
  },
  webRemainingTimeText: {
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      color: '#6366F1',
      paddingHorizontal: 8, 
      paddingVertical: 3, 
      borderRadius: 8,
      fontSize: 11, 
      fontWeight: 'bold',
      alignSelf: 'flex-start',
      marginLeft: 'auto', // Sağa yaslamak için (flexDirection: row içinde)
  },
  webCardBody: {
      marginTop: 15,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
  },
  webCardText: {
      fontSize: 14,
      color: '#4B5563',
      marginBottom: 5,
  },
  webCardFooter: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      opacity: 0.8,
  },
  webCardFooterText: {
      fontSize: 13,
      color: '#6B7280',
      marginLeft: 6,
  },
  webEmptyState: {
      paddingVertical: 40,
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      minHeight: 150, // Yükseklik vermek için
  },
   webEmptyStateText: {
      marginTop: 15,
      fontSize: 16,
      color: '#6B7280',
  },
   webTherapistGrid: {
       // display: 'grid', // Yorum satırı
       // gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
       // gap: '25px',
       flexDirection: 'row',
       flexWrap: 'wrap',
       justifyContent: 'space-around',
       marginHorizontal: -10, // Kart margin'i ile dengele
   },
   webTherapistCard: {
       backgroundColor: 'white',
       borderRadius: 12,
       padding: 20,
       alignItems: 'center',
       elevation: 5,
       // cursor: 'pointer', // Yorum satırı
       // transition: 'transform 0.2s ease-in-out', // Yorum satırı
       width: Platform.select({ 
          // web: 'calc(25% - 20px)', // Hesaplama RN'de doğrudan çalışmaz
          web: '23%', // % veya flex tabanlı yaklaşım (4 sütun için)
          default: '45%',
       }),
       marginBottom: 20, 
       marginHorizontal: '1%', // % veya flex tabanlı yaklaşım
       justifyContent: 'space-between', // İçeriği dikeyde yaymak için
   },
   webTherapistImageLarge: {
       width: 100,
       height: 100,
       borderRadius: 50,
       marginBottom: 15,
       alignSelf: 'center',
       backgroundColor: '#eee',
   },
   webTherapistBio: { // Yeni Stil
       fontSize: 13,
       color: '#6B7280',
       marginTop: 8,
       minHeight: 36, // Yaklaşık 2 satır için
       textAlign: 'center',
   },
   webCardBookButton: { // Yeni Stil
       backgroundColor: '#6366F1', // Farklı bir renk de olabilir
       borderRadius: 6,
       paddingVertical: 8,
       paddingHorizontal: 15,
       marginTop: 15, // Bio'dan sonra boşluk
       alignSelf: 'stretch', // Kartın genişliğine yayıl
   },
   webCardBookButtonText: { // Yeni Stil
       color: 'white',
       textAlign: 'center',
       fontWeight: '500',
       fontSize: 14,
   },
  // --- Bitiş: Web'e Özel Stiller ---

  // --- Admin Panel Stilleri --- (DEĞİŞTİRİLMEDİ)
  adminPanel: {
    padding: 20,
  },
  adminPanelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  adminStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  adminStatCard: {
    // Platforma göre genişlik ayarı
    width: Platform.OS === 'web' ? '30%' : (width - 60) / 3,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
    marginBottom: Platform.OS === 'web' ? 15 : 0, // Webde kartlar arası alt boşluk
  },
  adminStatIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  adminStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  adminStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  adminActionCards: {
    marginTop: 10,
  },
  adminActionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  adminActionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  adminActionContent: {
    flex: 1,
  },
  adminActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  adminActionDescription: {
    fontSize: 12,
    color: '#666',
  },

  // --- Terapist Panel Stilleri --- (DEĞİŞTİRİLMEDİ)
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 25,
  },
  statCard: {
    // Platforma göre genişlik ayarı
    width: Platform.OS === 'web' ? '30%' : (width - 60) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 3,
    marginBottom: Platform.OS === 'web' ? 15 : 0, // Webde kartlar arası alt boşluk
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    // Arka plan rengi render fonksiyonunda belirleniyor
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  clientsContainer: { // Terapist paneli danışan listesi
    paddingHorizontal: 20,
  },
  clientCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clientImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  clientInfoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clientDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  // --- Logout Button Styles (Ekleniyor/Doğrulanıyor) ---
  logoutButton: { 
    backgroundColor: '#FF6B6B', 
    borderRadius: 12,
    paddingVertical: 14, 
    alignItems: 'center',
    marginTop: 25, 
    marginHorizontal: Platform.select({ web: 0, default: 20 }), 
    flexDirection: 'row', 
    justifyContent: 'center'
  },
  webLogoutButton: {
    borderColor: '#DC2626',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: 'auto',
    alignSelf: 'center',
    shadowOpacity: 0,
    elevation: 0,
    borderRadius: 8, 
    backgroundColor: 'transparent',
    marginTop: 30, 
  },
  webLogoutButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  actionIcon: { 
    marginRight: 8,
  },
  actionText: { 
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // --- End Logout Button Styles ---

  // --- YENİ: Web Terapist Özel Stilleri ---
  webTherapistQuickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Butonları yay
    flexWrap: 'wrap', // Küçük ekranlarda alta kaydır
    gap: 20, // Butonlar arası boşluk
    marginBottom: 40,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
     shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
  },
  webTherapistQuickActionButton: {
    alignItems: 'center',
    padding: 15,
    minWidth: 150, // Minimum genişlik
    // backgroundColor: '#F9FAFB', // Opsiyonel arka plan
    // borderRadius: 12, // Opsiyonel köşe yuvarlama
    // borderWidth: 1, // Opsiyonel kenarlık
    // borderColor: '#E5E7EB', // Opsiyonel kenarlık rengi
  },
  webTherapistQuickActionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  webTherapistAppointmentsList: { // Terapist randevu listesi/grisi
     // Tek sütun liste görünümü şimdilik
     // Daha sonra grid için webTherapistAppointmentsGrid stili tanımlanabilir
     maxHeight: 600, // Maksimum yükseklik eklendi
     overflow: 'scroll', // Taşma durumunda kaydırma eklendi
  },
  webTherapistAppointmentCard: { // Terapist randevu kartı (Web)
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#6366F1', // Sol kenar vurgusu
  },
  webTherapistClientImageSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eee',
  },
  webTherapistRemainingTime: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#EF4444', // Dikkat çekici renk (örneğin kırmızı)
    marginTop: 4,
  },
  webTherapistDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  webAvailabilityCard: {
      backgroundColor: '#EEF2FF', // Farklı bir arka plan rengi
      borderRadius: 12,
      padding: 25,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 3,
  },

  // --- YENİ: İki Sütunlu Layout Stilleri --- 
  webColumnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 20, // Sütunlar arası boşluk (Web için)
  },
  webLeftColumn: {
    // flex: 1, // veya belirli bir genişlik
    width: '58%', // Sol sütun biraz daha geniş olabilir
  },
  webRightColumn: {
    // flex: 1,
    width: '40%', // Sağ sütun
  },
});
