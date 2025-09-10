import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
  Modal
} from 'react-native';
import { Stack, router, Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, AntDesign, FontAwesome, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { TherapistUser, CustomerUser, User, UserStatus } from '../../../src/types/api.types';
import { useUpdateTherapistStatus, useGetPendingTherapists } from '../../../src/hooks/useApi';

// Dashboard istatistikleri tipi
interface DashboardStats {
  totalUsers: number;
  totalTherapists: number;
  totalCustomers: number;
  totalAdmins: number;
  pendingTherapists: number;
  activeUsers: number;
}

const { width, height } = Dimensions.get('window');

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [therapists, setTherapists] = useState<TherapistUser[]>([]);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTherapist, setSelectedTherapist] = useState<TherapistUser | null>(null);
  const [isTherapistDetailModalVisible, setTherapistDetailModalVisible] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTherapists: 0,
    totalCustomers: 0,
    totalAdmins: 0,
    pendingTherapists: 0,
    activeUsers: 0
  });

  const [activeTab, setActiveTab] = useState<'all' | 'therapists' | 'customers' | 'admins' | 'pending'>('all');
  
  // Terapist durum güncelleme hook'u
  const updateTherapistStatusHook = useUpdateTherapistStatus();
  const getPendingTherapistsHook = useGetPendingTherapists();
  
  // API'den kullanıcıları yükleme
  useEffect(() => {
    const loadUsersData = async () => {
      try {
        setLoading(true);
        
        // Demo token yerine var olan token'ı kullanıyoruz
        // API çağrılarının başarısız olması durumunda 
        // kullanıcıdan tekrar giriş yapmasını isteyebiliriz
        const currentToken = api.getToken();
        console.log('Mevcut Token:', currentToken ? 'Token var' : 'Token yok');
        
        if (!currentToken) {
          console.warn('Token bulunamadı. Oturum açmanız gerekebilir.');
          // Alert.alert('Uyarı', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
          // router.replace('/auth/login');
          // return;
        }
        
        // API'den tüm kullanıcıları getir
        const response = await api.users.listAll(1, 100);
        
        if (response && response.users) {
          // Kullanıcıları rollerine göre ayır
          const allTherapists = response.users.filter(user => user.role === 'therapist') as TherapistUser[];
          const allCustomers = response.users.filter(user => user.role === 'customer') as CustomerUser[];
          const allAdmins = response.users.filter(user => user.role === 'admin') as User[];
          
          // Kullanıcı verilerini ayarla
          setTherapists(allTherapists);
          setCustomers(allCustomers);
          setAdmins(allAdmins);
          
          // İstatistikleri hesapla
          const pendingTherapistsCount = allTherapists.filter(t => t.status === 'pending').length;
          const activeUsersCount = response.users.filter(u => u.status === 'active').length;
          
          setStats({
            totalUsers: response.total,
            totalTherapists: allTherapists.length,
            totalCustomers: allCustomers.length,
            totalAdmins: allAdmins.length,
            pendingTherapists: pendingTherapistsCount,
            activeUsers: activeUsersCount
          });
          
          // Bekleyen terapistleri de ayrıca yükleyelim
          try {
            console.log('Bekleyen terapistler yükleniyor...');
            const pendingResponse = await getPendingTherapistsHook.request();
            
            if (pendingResponse) {
              console.log('Bekleyen terapistler API yanıtı:', pendingResponse);
              
              // API yanıt formatına göre iki farklı durum için kontrol edelim
              if (Array.isArray(pendingResponse)) {
                // Eğer doğrudan dizi dönerse
                console.log('Bekleyen terapistler dizisi alındı, uzunluk:', pendingResponse.length);
                setStats(prevStats => ({
                  ...prevStats,
                  pendingTherapists: pendingResponse.length
                }));
                
                // Ayrıca terapist listesini de güncelleyelim
                const pendingTherapists = pendingResponse as TherapistUser[];
                
                // Tüm terapistleri birleştirip status'e göre filtreleme yapalım
                const existingNonPendingTherapists = therapists.filter(t => t.status !== 'pending');
                setTherapists([...existingNonPendingTherapists, ...pendingTherapists]);
              } 
              else if (pendingResponse.users) {
                // Eğer { users: [...], total: number } formatında dönerse
                console.log('Bekleyen terapistler objesi alındı, uzunluk:', pendingResponse.users.length);
                setStats(prevStats => ({
                  ...prevStats,
                  pendingTherapists: pendingResponse.users.length
                }));
                
                // Ayrıca terapist listesini de güncelleyelim
                const pendingTherapists = pendingResponse.users.filter(u => u.role === 'therapist' && u.status === 'pending') as TherapistUser[];
                
                // Tüm terapistleri birleştirip status'e göre filtreleme yapalım
                const existingNonPendingTherapists = therapists.filter(t => t.status !== 'pending');
                setTherapists([...existingNonPendingTherapists, ...pendingTherapists]);
              }
            }
          } catch (pendingError) {
            console.error("Bekleyen terapistler yüklenirken hata:", pendingError);
          }
        }
        
      } catch (err) {
        console.error("Kullanıcı verileri yüklenirken hata:", err);
        Alert.alert('Hata', 'Kullanıcı verileri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
        
        // Test için örnek veriler
        setDemoData();
      } finally {
        setLoading(false);
      }
    };

    loadUsersData();
  }, []);
  
  // Demo verilerini ayarla (API bağlantısı kurulamazsa)
  const setDemoData = () => {
    // Örnek terapist verileri
    const demoTherapists: TherapistUser[] = [
      {
        _id: "t1001",
        name: "Dr. Ahmet Kaya",
        email: "ahmet.kaya@example.com",
        phone: "5551112233",
        role: "therapist",
        status: "active",
        specialty: "Bilişsel Davranışçı Terapi",
        licenseNumber: "TR-PSY-12345",
        yearsOfExperience: 8,
        createdAt: "2023-01-15T08:30:00.000Z",
        updatedAt: "2023-10-10T14:20:00.000Z"
      },
      {
        _id: "t1002",
        name: "Dr. Zeynep Demir",
        email: "zeynep.demir@example.com",
        phone: "5552223344",
        role: "therapist",
        status: "pending",
        specialty: "Aile Terapisi",
        licenseNumber: "TR-PSY-23456",
        yearsOfExperience: 5,
        createdAt: "2023-03-20T10:15:00.000Z",
        updatedAt: "2023-09-25T11:30:00.000Z"
      },
      {
        _id: "t1003",
        name: "Dr. Mehmet Öztürk",
        email: "mehmet.ozturk@example.com",
        phone: "5553334455",
        role: "therapist",
        status: "pending",
        specialty: "Travma Terapisi",
        licenseNumber: "TR-PSY-34567",
        yearsOfExperience: 10,
        createdAt: "2023-02-10T09:45:00.000Z",
        updatedAt: "2023-10-05T16:40:00.000Z"
      }
    ];
    
    // Örnek müşteri verileri
    const demoCustomers: CustomerUser[] = [
      {
        _id: "c1001",
        name: "Ayşe Yılmaz",
        email: "ayse.yilmaz@example.com",
        phone: "5554445566",
        role: "customer",
        status: "active",
        createdAt: "2023-05-05T13:20:00.000Z",
        updatedAt: "2023-10-12T09:10:00.000Z"
      },
      {
        _id: "c1002",
        name: "Ali Çelik",
        email: "ali.celik@example.com",
        phone: "5556667788",
        role: "customer",
        status: "active",
        createdAt: "2023-04-18T15:30:00.000Z",
        updatedAt: "2023-10-08T14:25:00.000Z"
      },
      {
        _id: "c1003",
        name: "Fatma Şahin",
        email: "fatma.sahin@example.com",
        phone: "5557778899",
        role: "customer",
        status: "inactive",
        createdAt: "2023-03-25T11:40:00.000Z",
        updatedAt: "2023-09-30T10:15:00.000Z"
      }
    ];
    
    // Örnek admin verileri
    const demoAdmins: User[] = [
      {
        _id: "a1001",
        name: "Kemal Yönetici",
        email: "kemal.admin@example.com",
        phone: "5551234567",
        role: "admin",
        status: "active",
        createdAt: "2023-01-01T10:00:00.000Z",
        updatedAt: "2023-10-15T11:30:00.000Z"
      },
      {
        _id: "a1002",
        name: "Selin Aydın",
        email: "selin.admin@example.com",
        phone: "5559876543",
        role: "admin",
        status: "active",
        createdAt: "2023-02-15T09:30:00.000Z",
        updatedAt: "2023-10-10T14:45:00.000Z"
      }
    ];
    
    setTherapists(demoTherapists);
    setCustomers(demoCustomers);
    setAdmins(demoAdmins);
    
    setStats({
      totalUsers: demoTherapists.length + demoCustomers.length + demoAdmins.length,
      totalTherapists: demoTherapists.length,
      totalCustomers: demoCustomers.length,
      totalAdmins: demoAdmins.length,
      pendingTherapists: demoTherapists.filter(t => t.status === 'pending').length,
      activeUsers: [...demoTherapists, ...demoCustomers, ...demoAdmins].filter(u => u.status === 'active').length
    });
  };
  
  // Tarih formatlama
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };
  
  // Kullanıcı durumu için Türkçe metin
  const getUserStatusText = (status: UserStatus): string => {
    switch(status) {
      case 'active': return 'Aktif';
      case 'pending': return 'Onay Bekliyor';
      case 'suspended': return 'Askıya Alınmış';
      case 'inactive': return 'Pasif';
      default: return status;
    }
  };
  
  // Kullanıcı durumu için stil
  const getUserStatusStyle = (status: UserStatus) => {
    switch(status) {
      case 'active':
        return { bg: styles.statusActiveBg, text: styles.statusActiveText };
      case 'pending':
        return { bg: styles.statusPendingBg, text: styles.statusPendingText };
      case 'suspended':
        return { bg: styles.statusSuspendedBg, text: styles.statusSuspendedText };
      case 'inactive':
        return { bg: styles.statusInactiveBg, text: styles.statusInactiveText };
      default:
        return { bg: styles.statusDefaultBg, text: styles.statusDefaultText };
    }
  };
  
  // Filtreleme
  const getFilteredUsers = () => {
    const query = searchQuery.toLowerCase();
    
    let filteredUsers: User[] = [];
    
    if (activeTab === 'all') {
      filteredUsers = [...therapists, ...customers, ...admins];
    } else if (activeTab === 'therapists') {
      filteredUsers = [...therapists];
    } else if (activeTab === 'customers') {
      filteredUsers = [...customers];
    } else if (activeTab === 'admins') {
      filteredUsers = [...admins];
    } else if (activeTab === 'pending') {
      filteredUsers = therapists.filter(t => t.status === 'pending');
    }
    
    // Arama filtresi uygula
    if (query) {
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(query) || 
        user.email.toLowerCase().includes(query) ||
        (user.phone && user.phone.includes(query))
      );
    }
    
    return filteredUsers;
  };
  
  // Kullanıcı kartı render fonksiyonu
  const renderUserItem = (user: User) => {
    const statusStyle = getUserStatusStyle(user.status);
    const isTherapist = user.role === 'therapist';
    const isAdmin = user.role === 'admin';
    const isCustomer = user.role === 'customer';
    
    // Role göre kart arka plan rengini belirle
    const cardStyle = [
      styles.userCard,
      isAdmin ? styles.adminCard : null,
      isTherapist && user.status === 'pending' ? styles.pendingCard : null
    ];
    
    return (
      <TouchableOpacity 
        key={user._id}
        style={cardStyle}
        onPress={() => handleUserPress(user)}
      >
        <View style={styles.userImageContainer}>
          <View style={[
            styles.userImage, 
            isAdmin ? styles.adminImage : null,
            isTherapist ? styles.therapistImage : null
          ]}>
            <Text style={[
              styles.userInitials,
              isAdmin ? styles.adminInitials : null
            ]}>
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </Text>
          </View>
          {isTherapist && (
            <View style={styles.roleBadge}>
              <Ionicons name="medical" size={12} color="#fff" />
            </View>
          )}
          {isAdmin && (
            <View style={[styles.roleBadge, styles.adminBadge]}>
              <Ionicons name="shield" size={12} color="#fff" />
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.userMetaRow}>
            <Text style={styles.userMeta}>
              <Ionicons name="calendar-outline" size={12} color="#888" /> Kayıt: {formatDate(user.createdAt)}
            </Text>
            {user.phone && (
              <Text style={styles.userMeta}>
                <Ionicons name="call-outline" size={12} color="#888" /> {user.phone}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.userActions}>
          <View style={[styles.statusBadge, statusStyle.bg]}>
            <Text style={[styles.statusText, statusStyle.text]}>
              {getUserStatusText(user.status)}
            </Text>
          </View>
          
          <View style={styles.roleBadgeText}>
            <Text style={[
              styles.roleBadgeLabel,
              isAdmin ? styles.adminRoleText : null,
              isTherapist ? styles.therapistRoleText : null,
              isCustomer ? styles.customerRoleText : null
            ]}>
              {user.role === 'admin' ? 'Admin' : user.role === 'therapist' ? 'Terapist' : 'Müşteri'}
            </Text>
          </View>
          
          {isTherapist && (
            <Text style={styles.specialtyText}>
              {(user as TherapistUser).specialty || 'Uzmanlık belirtilmemiş'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // Kullanıcı kartına basıldığında
  const handleUserPress = (user: User) => {
    if (user.role === 'therapist' && user.status === 'pending') {
      // Bekleyen terapist detaylarını göster
      setSelectedTherapist(user as TherapistUser);
      setTherapistDetailModalVisible(true);
    } else {
      // Diğer kullanıcılar için sadece bilgi göster
      Alert.alert(
        `${user.name} - ${user.role === 'therapist' ? 'Terapist' : 'Müşteri'}`,
        `ID: ${user._id}\nE-posta: ${user.email}\nDurum: ${getUserStatusText(user.status)}`,
        [
          { text: "Tamam", style: "default" }
        ]
      );
    }
  };
  
  // Terapisti onayla
  const handleApproveTherapist = async (therapist: TherapistUser) => {
    try {
      setLoading(true);
      await updateTherapistStatusHook.request(therapist._id, 'active');
      
      // Terapist listesini güncelle
      const updatedTherapists = therapists.map(t => 
        t._id === therapist._id ? { ...t, status: 'active' as UserStatus } : t
      );
      
      setTherapists(updatedTherapists);
      
      // İstatistikleri güncelle
      setStats({
        ...stats,
        pendingTherapists: stats.pendingTherapists - 1,
        activeUsers: stats.activeUsers + 1
      });
      
      Alert.alert(
        "Başarılı",
        `${therapist.name} terapist olarak onaylandı.`,
        [{ text: "Tamam", style: "default" }]
      );
      
      // Detay modalını kapat
      setTherapistDetailModalVisible(false);
    } catch (error) {
      console.error("Terapist onaylama hatası:", error);
      Alert.alert(
        "Hata",
        "Terapist onaylanırken bir hata oluştu. Lütfen tekrar deneyin.",
        [{ text: "Tamam", style: "default" }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Terapisti reddet
  const handleRejectTherapist = async (therapist: TherapistUser) => {
    try {
      setLoading(true);
      await updateTherapistStatusHook.request(therapist._id, 'rejected');
      
      // Terapist listesini güncelle
      const updatedTherapists = therapists.map(t => 
        t._id === therapist._id ? { ...t, status: 'rejected' as UserStatus } : t
      );
      
      setTherapists(updatedTherapists);
      
      // İstatistikleri güncelle
      setStats({
        ...stats,
        pendingTherapists: stats.pendingTherapists - 1
      });
      
      Alert.alert(
        "Bilgi",
        `${therapist.name} terapist başvurusu reddedildi.`,
        [{ text: "Tamam", style: "default" }]
      );
      
      // Detay modalını kapat
      setTherapistDetailModalVisible(false);
    } catch (error) {
      console.error("Terapist reddetme hatası:", error);
      Alert.alert(
        "Hata",
        "Terapist reddedilirken bir hata oluştu. Lütfen tekrar deneyin.",
        [{ text: "Tamam", style: "default" }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Terapist durum güncelleme
  const handleUpdateTherapistStatus = async (therapist: TherapistUser, status: 'active' | 'pending' | 'rejected' | 'suspended') => {
    try {
      setLoading(true);
      await updateTherapistStatusHook.request(therapist._id, status);
      
      // Terapist listesini güncelle
      const updatedTherapists = therapists.map(t => 
        t._id === therapist._id ? { ...t, status: status as UserStatus } : t
      );
      
      setTherapists(updatedTherapists);
      
      // İstatistikleri güncelle
      let pendingCount = stats.pendingTherapists;
      let activeCount = stats.activeUsers;
      
      if (therapist.status === 'pending' && status !== 'pending') {
        pendingCount--;
      } else if (therapist.status !== 'pending' && status === 'pending') {
        pendingCount++;
      }
      
      if (status === 'active') {
        if (therapist.status !== 'active') activeCount++;
      } else if (therapist.status === 'active') {
        activeCount--;
      }
      
      setStats({
        ...stats,
        pendingTherapists: pendingCount,
        activeUsers: activeCount
      });
      
      Alert.alert(
        "Başarılı",
        `${therapist.name} durumu güncellendi.`,
        [{ text: "Tamam", style: "default" }]
      );
      
      // Detay modalını kapat
      setTherapistDetailModalVisible(false);
    } catch (error) {
      console.error("Terapist durum güncelleme hatası:", error);
      Alert.alert(
        "Hata",
        "Terapist durumu güncellenirken bir hata oluştu. Lütfen tekrar deneyin.",
        [{ text: "Tamam", style: "default" }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Durum tabını değiştirme
  const handleTabChange = (tab: 'all' | 'therapists' | 'customers' | 'admins' | 'pending') => {
    setActiveTab(tab);
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9D6FF0" />
      </View>
    );
  }
  
  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        
        {/* Header */}
        <LinearGradient
          colors={['#6366F1', '#9D6FF0']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Admin Paneli</Text>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Dashboard İstatistikleri */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>İstatistikler</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                  <Ionicons name="people" size={22} color="#6366F1" />
                </View>
                <Text style={styles.statValue}>{stats.totalUsers}</Text>
                <Text style={styles.statLabel}>Toplam Kullanıcı</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(157, 111, 240, 0.1)' }]}>
                  <Ionicons name="medical" size={22} color="#9D6FF0" />
                </View>
                <Text style={styles.statValue}>{stats.totalTherapists}</Text>
                <Text style={styles.statLabel}>Terapist</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(34, 211, 238, 0.1)' }]}>
                  <Ionicons name="person" size={22} color="#22D3EE" />
                </View>
                <Text style={styles.statValue}>{stats.totalCustomers}</Text>
                <Text style={styles.statLabel}>Müşteri</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Ionicons name="shield" size={22} color="#4338CA" />
                </View>
                <Text style={styles.statValue}>{stats.totalAdmins}</Text>
                <Text style={styles.statLabel}>Yönetici</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Ionicons name="time" size={22} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{stats.pendingTherapists}</Text>
                <Text style={styles.statLabel}>Onay Bekleyen</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{stats.activeUsers}</Text>
                <Text style={styles.statLabel}>Aktif Kullanıcı</Text>
              </View>
            </View>
          </View>
          
          {/* Kullanıcı Listesi */}
          <View style={styles.usersContainer}>
            <View style={styles.usersHeader}>
              <Text style={styles.sectionTitle}>Kullanıcılar</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="İsim veya e-posta ara..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#888" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            
            {/* Filtre Tabları */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                onPress={() => handleTabChange('all')}
              >
                <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                  Tümü ({stats.totalUsers})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'therapists' && styles.activeTab]}
                onPress={() => handleTabChange('therapists')}
              >
                <Text style={[styles.tabText, activeTab === 'therapists' && styles.activeTabText]}>
                  Terapistler ({stats.totalTherapists})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'customers' && styles.activeTab]}
                onPress={() => handleTabChange('customers')}
              >
                <Text style={[styles.tabText, activeTab === 'customers' && styles.activeTabText]}>
                  Müşteriler ({stats.totalCustomers})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'admins' && styles.activeTab]}
                onPress={() => handleTabChange('admins')}
              >
                <Text style={[styles.tabText, activeTab === 'admins' && styles.activeTabText]}>
                  Yöneticiler ({admins.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                onPress={() => handleTabChange('pending')}
              >
                <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                  Onay Bekleyen ({stats.pendingTherapists})
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Kullanıcı Listesi */}
            <View style={styles.usersList}>
            {getFilteredUsers().length > 0 ? (
  <>
    {activeTab === 'all' ? (
      <>
        {admins.length > 0 && (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>Yöneticiler</Text>
            {admins.filter(admin => 
              searchQuery ? 
                admin.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                admin.email.toLowerCase().includes(searchQuery.toLowerCase()) : true
            ).map(user => renderUserItem(user))}
          </View>
        )}
        
        {therapists.filter(t => t.status === 'active').length > 0 && (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>Aktif Terapistler</Text>
            {therapists.filter(therapist => 
              therapist.status === 'active' && (
                searchQuery ? 
                  therapist.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  therapist.email.toLowerCase().includes(searchQuery.toLowerCase()) : true
              )
            ).map(user => renderUserItem(user))}
          </View>
        )}
        
        {therapists.filter(t => t.status === 'pending').length > 0 && (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>Bekleyen Terapistler</Text>
            {therapists.filter(therapist => 
              therapist.status === 'pending' && (
                searchQuery ? 
                  therapist.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  therapist.email.toLowerCase().includes(searchQuery.toLowerCase()) : true
              )
            ).map(user => renderUserItem(user))}
          </View>
        )}
        
        {customers.length > 0 && (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>Müşteriler</Text>
            {customers.filter(customer => 
              searchQuery ? 
                customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                customer.email.toLowerCase().includes(searchQuery.toLowerCase()) : true
            ).map(user => renderUserItem(user))}
          </View>
        )}
      </>
    ) : (
      getFilteredUsers().map(user => renderUserItem(user))
    )}
  </>
) : (
  <View style={styles.emptyState}>
    <Ionicons name="search" size={64} color="#ddd" />
    <Text style={styles.emptyStateText}>Kullanıcı bulunamadı</Text>
    <Text style={styles.emptyStateSubtext}>
      Arama kriterlerinize uygun kullanıcı bulunmamaktadır
    </Text>
  </View>
)}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Terapist Detay Modalı */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isTherapistDetailModalVisible}
        onRequestClose={() => setTherapistDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terapist Başvurusu</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setTherapistDetailModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedTherapist && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalImageContainer}>
                  <View style={styles.modalUserImage}>
                    <Text style={styles.modalUserInitials}>
                      {selectedTherapist.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.modalUserName}>{selectedTherapist.name}</Text>
                <Text style={styles.modalUserStatus}>Başvuru Durumu: <Text style={styles.statusPendingText}>Onay Bekliyor</Text></Text>
                
                {/* Terapist Detayları */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>İletişim Bilgileri</Text>
                  
                  <View style={styles.detailItem}>
                    <Ionicons name="mail-outline" size={20} color="#888" style={styles.detailIcon} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>E-posta</Text>
                      <Text style={styles.detailValue}>{selectedTherapist.email}</Text>
                    </View>
                  </View>
                  
                  {selectedTherapist.phone && (
                    <View style={styles.detailItem}>
                      <Ionicons name="call-outline" size={20} color="#888" style={styles.detailIcon} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Telefon</Text>
                        <Text style={styles.detailValue}>{selectedTherapist.phone}</Text>
                      </View>
                    </View>
                  )}
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Terapist Bilgileri</Text>
                  
                  <View style={styles.detailItem}>
                    <FontAwesome5 name="stethoscope" size={20} color="#888" style={styles.detailIcon} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Uzmanlık Alanı</Text>
                      <Text style={styles.detailValue}>{selectedTherapist.specialty}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <FontAwesome5 name="id-card" size={20} color="#888" style={styles.detailIcon} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Lisans Numarası</Text>
                      <Text style={styles.detailValue}>{selectedTherapist.licenseNumber}</Text>
                    </View>
                  </View>
                  
                  {selectedTherapist.yearsOfExperience && (
                    <View style={styles.detailItem}>
                      <FontAwesome5 name="user-clock" size={20} color="#888" style={styles.detailIcon} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Deneyim</Text>
                        <Text style={styles.detailValue}>{selectedTherapist.yearsOfExperience} yıl</Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedTherapist.educationBackground && (
                    <View style={styles.detailItem}>
                      <FontAwesome5 name="graduation-cap" size={20} color="#888" style={styles.detailIcon} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Eğitim Geçmişi</Text>
                        <Text style={styles.detailValue}>{selectedTherapist.educationBackground}</Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedTherapist.bio && (
                    <View style={styles.detailItem}>
                      <FontAwesome5 name="user-alt" size={20} color="#888" style={styles.detailIcon} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Biyografi</Text>
                        <Text style={styles.detailValue}>{selectedTherapist.bio}</Text>
                      </View>
                    </View>
                  )}
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Hesap Bilgileri</Text>
                  
                  <View style={styles.detailItem}>
                    <FontAwesome5 name="calendar-alt" size={20} color="#888" style={styles.detailIcon} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Kayıt Tarihi</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedTherapist.createdAt)}</Text>
                    </View>
                  </View>
                </View>
                
                {/* Onay/Red Butonları */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.rejectButton}
                    onPress={() => handleRejectTherapist(selectedTherapist)}
                  >
                    <Ionicons name="close-circle" size={20} color="white" />
                    <Text style={styles.buttonText}>Reddet</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.approveButton}
                    onPress={() => handleApproveTherapist(selectedTherapist)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.buttonText}>Onayla</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statsContainer: {
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: width / 2 - 30,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  usersContainer: {
    padding: 20,
  },
  usersHeader: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tab: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    color: '#555',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  usersList: {
    marginBottom: 20,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  adminCard: {
    borderLeftColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  pendingCard: {
    borderLeftColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  userImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminImage: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  therapistImage: {
    backgroundColor: 'rgba(157, 111, 240, 0.2)',
  },
  userInitials: {
    color: '#6366F1',
    fontSize: 18,
    fontWeight: 'bold',
  },
  adminInitials: {
    color: '#4338CA',
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#9D6FF0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  adminBadge: {
    backgroundColor: '#6366F1',
  },
  roleBadgeText: {
    marginBottom: 8,
  },
  roleBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  adminRoleText: {
    color: '#6366F1',
  },
  therapistRoleText: {
    color: '#9D6FF0',
  },
  customerRoleText: {
    color: '#22D3EE',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  userMeta: {
    fontSize: 12,
    color: '#888',
    marginRight: 12,
    marginBottom: 2,
  },
  userActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Status styles
  statusActiveBg: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  statusActiveText: {
    color: '#10B981',
  },
  statusPendingBg: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statusPendingText: {
    color: '#F59E0B',
  },
  statusSuspendedBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusSuspendedText: {
    color: '#EF4444',
  },
  statusInactiveBg: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  statusInactiveText: {
    color: '#6B7280',
  },
  statusDefaultBg: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  statusDefaultText: {
    color: '#6B7280',
  },
  specialtyText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#888',
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalUserImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalUserInitials: {
    color: '#6366F1',
    fontSize: 36,
    fontWeight: 'bold',
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalUserStatus: {
    fontSize: 14,
    color: '#666',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
}); 