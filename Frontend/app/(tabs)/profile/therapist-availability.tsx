import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Switch,
  Dimensions
} from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetProfile } from '../../../src/hooks/useApi';
import api from '../../../src/services/api';
import { TherapistUser } from '../../../src/types/api.types';

// Ekran boyutları
const { width, height } = Dimensions.get('window');

// Günler
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAYS_EN = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Zaman dilimleri
const TIME_SLOTS = [
  { id: 'morning', label: 'Sabah', time: '08:00 - 12:00', start: '08:00', end: '12:00' },
  { id: 'afternoon', label: 'Öğleden Sonra', time: '12:00 - 17:00', start: '12:00', end: '17:00' },
  { id: 'evening', label: 'Akşam', time: '17:00 - 21:00', start: '17:00', end: '21:00' }
];

// TypeScript tip tanımlamaları
interface TimeSlot {
  id: string;
  label: string;
  time: string;
  start: string;
  end: string;
}

interface DayAvailability {
  [slotId: string]: boolean;
}

interface AvailabilityType {
  [day: string]: DayAvailability;
}

// API için gerekli tip tanımlamaları
interface AvailabilitySlot {
  dayOfWeek: string;
  isWeekday: boolean;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AvailabilityRequest {
  userId: number;
  availabilities: AvailabilitySlot[];
}

// Her gün ve slot için rasgele kullanılabilirlik durumu tanımlama
const createInitialAvailability = (): AvailabilityType => {
  return DAYS.reduce((acc, day, index) => {
    acc[day] = TIME_SLOTS.reduce((slotAcc, slot) => {
      slotAcc[slot.id] = Math.random() > 0.5; // Rasgele true veya false
      return slotAcc;
    }, {} as DayAvailability);
    return acc;
  }, {} as AvailabilityType);
};

const INITIAL_AVAILABILITY = createInitialAvailability();

export default function TherapistAvailabilityScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [therapist, setTherapist] = useState<TherapistUser | null>(null);
  const [availability, setAvailability] = useState<AvailabilityType>(INITIAL_AVAILABILITY);
  const [changed, setChanged] = useState(false);
  
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
        console.log("Gelen Profil Verisi:", JSON.stringify(profileData, null, 2));
        
        if (profileData && profileData.role === 'therapist') {
          setTherapist(profileData as TherapistUser);
          
          // Gerçekte burada API'den müsaitlik bilgilerini almak gerekir
          // Örnek: const availabilityData = await api.request('/api/availability');
          
          // Şimdilik rasgele değerler kullanıyoruz
          
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

  // Müsaitlik durumunu değiştirme
  const toggleAvailability = (day: string, slot: string) => {
    setAvailability(prev => {
      const newAvailability = { ...prev };
      if (newAvailability[day]) {
        newAvailability[day][slot] = !newAvailability[day][slot];
      }
      return newAvailability;
    });
    setChanged(true);
  };
  
  // Gün için tüm zaman dilimlerini ayarlama
  const toggleDay = (day: string, value: boolean) => {
    setAvailability(prev => {
      const newAvailability = { ...prev };
      
      if (newAvailability[day]) {
        TIME_SLOTS.forEach(slot => {
          newAvailability[day][slot.id] = value;
        });
      }
      
      return newAvailability;
    });
    setChanged(true);
  };
  
  // Zaman dilimi için tüm günleri ayarlama
  const toggleTimeSlot = (slotId: string, value: boolean) => {
    setAvailability(prev => {
      const newAvailability = { ...prev };
      
      DAYS.forEach(day => {
        if (newAvailability[day]) {
          newAvailability[day][slotId] = value;
        }
      });
      
      return newAvailability;
    });
    setChanged(true);
  };
  
  // Gün için tüm zaman dilimlerinin müsait olup olmadığını kontrol etme
  const isDayAvailable = (day: string): boolean => {
    if (!availability[day]) return false;
    return TIME_SLOTS.every(slot => availability[day][slot.id]);
  };
  
  // Gün için tüm zaman dilimlerinin uygun olmadığını kontrol etme
  const isDayUnavailable = (day: string): boolean => {
    if (!availability[day]) return true;
    return TIME_SLOTS.every(slot => !availability[day][slot.id]);
  };
  
  // Zaman dilimi için tüm günlerin müsait olup olmadığını kontrol etme
  const isTimeSlotAvailable = (slotId: string): boolean => {
    return DAYS.every(day => availability[day] && availability[day][slotId]);
  };
  
  // Zaman dilimi için tüm günlerin uygun olmadığını kontrol etme
  const isTimeSlotUnavailable = (slotId: string): boolean => {
    return DAYS.every(day => availability[day] && !availability[day][slotId]);
  };
  
  // Mevcut müsaitlik durumunu API formatına dönüştür
  const prepareAvailabilityData = (): AvailabilityRequest => {
    const availabilitySlots: AvailabilitySlot[] = [];
    
    DAYS.forEach((day, dayIndex) => {
      TIME_SLOTS.forEach(slot => {
        if (availability[day]) {
          const isAvailable = availability[day][slot.id];
          availabilitySlots.push({
            dayOfWeek: DAYS_EN[dayIndex], 
            isWeekday: dayIndex < 5, 
            // Saati HH:MM:SS formatına çevir
            startTime: `${slot.start}:00`, 
            endTime: `${slot.end}:00`,    
            isAvailable: isAvailable
          });
        }
      });
    });
    
    let userId = 0;
    if (therapist?.id !== undefined && therapist?.id !== null) {
      userId = therapist.id;
    }
    
    console.log("prepareAvailabilityData - Kullanılan userId:", userId);
    
    return {
      userId: userId,
      availabilities: availabilitySlots
    };
  };
  
  // Kaydetme işlemi
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // API formatında veri hazırla
      const requestData = prepareAvailabilityData();
      
      // Gönderilecek veriyi KONSOLA YAZDIRALIM
      console.log("API'ye Gönderilen Müsaitlik Verisi:", JSON.stringify(requestData, null, 2));
      
      if (!requestData.userId || requestData.userId <= 0) {
        Alert.alert(
          "Hata",
          "Geçerli bir kullanıcı kimliği bulunamadı. Lütfen daha sonra tekrar deneyin.",
          [{ text: "Tamam" }]
        );
        return;
      }
      
      // API'ye gönder
      await api.request('/availability', 'POST', requestData);
      
      Alert.alert(
        "Başarılı",
        "Müsaitlik zamanlarınız başarıyla kaydedilmiştir.",
        [
          { text: "Tamam", onPress: () => setChanged(false) }
        ]
      );
    } catch (err) {
      console.error("Müsaitlik zamanları kaydedilirken hata:", err);
      Alert.alert(
        "Hata",
        "Müsaitlik zamanları kaydedilemedi. Lütfen daha sonra tekrar deneyin.",
        [{ text: "Tamam" }]
      );
    } finally {
      setSaving(false);
    }
  };

  // Profil sayfasına dön
  const handleBack = () => {
    if (changed) {
        Alert.alert(
        "Uyarı",
        "Değişiklikleriniz kaydedilmedi. Çıkmak istediğinizden emin misiniz?",
        [
          { text: "İptal", style: "cancel" },
          { text: "Kaydetmeden Çık", onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  // ---- Mobil Görünüm ----
  const renderMobileLayout = () => (
     <>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        
        {/* Mobil Üst Kısım */}
        <LinearGradient
          colors={['#9D6FF0', '#6366F1']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Müsaitlik Zamanları</Text>
            <View style={styles.placeholderButton} />
          </View>
          <Text style={styles.headerSubtitle}>
            Danışanlarınızın randevu alabileceği zaman aralıklarını ayarlayın
          </Text>
        </LinearGradient>
        
        {/* Mobil İçerik Scroll */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Müsaitlik Durumu Bölümü */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderContainer}>
              <View>
                <Text style={styles.sectionTitle}>Müsaitlik Durumu</Text>
                <Text style={styles.sectionDescription}>
                  Uygun olduğunuz zaman dilimlerini seçin. Danışanlarınız yalnızca bu saatlerde randevu oluşturabilirler.
            </Text>
          </View>
          
              {/* Tümünü seç/kaldır butonu */}
              <TouchableOpacity 
                style={styles.selectAllButton}
                onPress={() => {
                  // Tüm zamanlar seçili mi kontrol et
                  const allSelected = DAYS.every(day => 
                    TIME_SLOTS.every(slot => availability[day]?.[slot.id])
                  );
                  
                  // Tüm günleri ve slotları tam tersine ayarla
                  DAYS.forEach(day => {
                    toggleDay(day, !allSelected);
                  });
                }}
              >
                <Text style={styles.selectAllText}>
                  {DAYS.every(day => 
                    TIME_SLOTS.every(slot => availability[day]?.[slot.id])
                  ) ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </Text>
              </TouchableOpacity>
                </View>
                
            {/* Tablo Başlıkları */}
            <View style={styles.tableHeader}>
              <View style={styles.dayHeaderCell}>
                <Text style={styles.dayHeaderText}>Günler</Text>
              </View>
              
              {TIME_SLOTS.map(slot => (
                <View key={slot.id} style={styles.slotHeaderCell}>
                  <Text style={styles.slotHeaderText}>{slot.label}</Text>
                  <Text style={styles.slotTimeText}>{slot.time}</Text>
                  
                  {/* Sütun için toplu ayarlama */}
                  <TouchableOpacity
                    style={[
                      styles.columnToggle,
                      isTimeSlotAvailable(slot.id) ? styles.columnToggleAll : 
                      isTimeSlotUnavailable(slot.id) ? styles.columnToggleNone : 
                      styles.columnToggleMixed
                    ]}
                    onPress={() => toggleTimeSlot(slot.id, isTimeSlotAvailable(slot.id) ? false : true)}
                  >
                    <Ionicons 
                      name={isTimeSlotAvailable(slot.id) ? "remove" : "add"} 
                      size={16} 
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            
            {/* Tablo Satırları */}
            {DAYS.map(day => (
              <View key={day} style={styles.tableRow}>
                <View style={styles.dayCell}>
                  <Text style={styles.dayText}>{day}</Text>
                  
                  {/* Satır için toplu ayarlama */}
                  <TouchableOpacity
                    style={[
                      styles.rowToggle,
                      isDayAvailable(day) ? styles.rowToggleAll : 
                      isDayUnavailable(day) ? styles.rowToggleNone : 
                      styles.rowToggleMixed
                    ]}
                    onPress={() => toggleDay(day, isDayAvailable(day) ? false : true)}
                  >
                    <Ionicons 
                      name={isDayAvailable(day) ? "remove" : "add"} 
                      size={16} 
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
                
                {TIME_SLOTS.map(slot => (
                  <View key={`${day}-${slot.id}`} style={styles.availabilityCell}>
                  <Switch
                      value={availability[day]?.[slot.id] ?? false}
                      onValueChange={() => toggleAvailability(day, slot.id)}
                      thumbColor={availability[day]?.[slot.id] ? '#6366F1' : '#f4f3f4'}
                      trackColor={{ false: '#E5E7EB', true: 'rgba(99, 102, 241, 0.3)' }}
                    ios_backgroundColor="#E5E7EB"
                      style={styles.switch}
                  />
                </View>
                ))}
              </View>
            ))}
          </View>
          
          {/* Özel Durumlar Bölümü */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Özel Durumlar</Text>
            <Text style={styles.sectionDescription}>
              Tatil, izin veya diğer özel durumlar için tamamen müsait olmadığınız günleri ayarlayabilirsiniz.
            </Text>
            
            <TouchableOpacity 
              style={styles.specialDatesButton}
              onPress={() => Alert.alert(
                'Özel Tarihler',
                'Bu özellik yakında eklenecektir. Tatil, izin gibi özel durumları ayarlayabileceksiniz.'
              )}
            >
              <Ionicons name="calendar-outline" size={20} color="#6366F1" style={styles.specialDatesIcon} />
              <Text style={styles.specialDatesText}>Özel Tarihleri Yönet</Text>
              <Ionicons name="chevron-forward" size={20} color="#6366F1" />
            </TouchableOpacity>
                </View>
                
          {/* Randevu Süreleri Bölümü */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Randevu Süreleri</Text>
            <Text style={styles.sectionDescription}>
              Varsayılan randevu süresini ve randevular arasında bırakmak istediğiniz süreyi belirleyin.
            </Text>
            
                  <TouchableOpacity
              style={styles.appointmentSettingsButton}
              onPress={() => Alert.alert(
                'Randevu Ayarları',
                'Bu özellik yakında eklenecektir. Randevu süresi, ara süre gibi ayarlar yapabileceksiniz.'
              )}
            >
              <Ionicons name="time-outline" size={20} color="#6366F1" style={styles.appointmentSettingsIcon} />
              <Text style={styles.appointmentSettingsText}>Randevu Ayarlarını Düzenle</Text>
              <Ionicons name="chevron-forward" size={20} color="#6366F1" />
                  </TouchableOpacity>
          </View>
          
          {/* Kaydet/İptal Butonları */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleBack} disabled={saving}>
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton, (!changed || saving) && styles.saveButtonDisabled]} onPress={handleSave} disabled={!changed || saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Kaydet</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );

  // ---- Web Görünümü ----
  const renderWebLayout = () => (
    <LinearGradient 
        colors={['#A78BFA', '#D8B4FE', '#F5F3FF']} 
        style={styles.webBackgroundGradient} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 0, y: 1 }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* --- YENİ: Web Üst Barı (index.tsx'ten alındı) --- */}
      <View style={styles.webTopBar}> {/* webTopBar stilini index.tsx'ten ekleyeceğiz */}
            <TouchableOpacity onPress={() => router.push('/')}> 
              <Text style={styles.webTopBarTitle}>NeuroMeet</Text> {/* webTopBarTitle stilini index.tsx'ten ekleyeceğiz */}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}> 
              <Ionicons name="person-circle-outline" size={32} color="white" style={styles.webProfileIcon} /> {/* webProfileIcon stilini index.tsx'ten ekleyeceğiz */}
            </TouchableOpacity>
       </View>
      {/* --- Bitiş: Web Üst Barı --- */}
      
      {/* Orijinal ScrollView, paddingTop eklendi */}
      <ScrollView contentContainerStyle={styles.webScrollContainer} style={{ paddingTop: 75 }}> 
          <View style={styles.webMaxContentWidth}>
              {/* Web Başlık Alanı - Geri Tuşu Kaldırıldı */}
              <View style={[styles.webHeader, { justifyContent: 'center' }]}> 
                  {/* 
                  <TouchableOpacity style={styles.webBackButton} onPress={handleBack}>
                      <Ionicons name="arrow-back" size={28} color="#4B5563" />
                  </TouchableOpacity>
                  */}
                 <Text style={styles.webTitle}>Müsaitlik Zamanlarınızı Yönetin</Text>
                 {/* Boşluk kaldırıldı, başlık ortalandı */}
                 {/* <View style={{ width: 40 }} /> */}
              </View>
                
              {/* Müsaitlik Tablosu (İçerik Eklendi) */}
              <View style={styles.webSectionContainer}>
                  <View style={styles.webSectionHeader}>
                      <View> {/* Başlık ve açıklamayı grupla */} 
                          <Text style={styles.webSectionTitle}>Müsaitlik Durumu</Text>
                          <Text style={styles.webSectionDescription}>
                             Uygun olduğunuz zaman dilimlerini seçin. Danışanlarınız yalnızca bu saatlerde randevu oluşturabilirler.
                           </Text>
                      </View>
                       <TouchableOpacity style={styles.webSelectAllButton} onPress={() => { const allSelected = DAYS.every(day => TIME_SLOTS.every(slot => availability[day]?.[slot.id])); DAYS.forEach(day => { toggleDay(day, !allSelected); }); }}>
                           <Text style={styles.webSelectAllText}>{DAYS.every(day => TIME_SLOTS.every(slot => availability[day]?.[slot.id])) ? 'Tümünü Kaldır' : 'Tümünü Seç'}</Text>
                       </TouchableOpacity>
                  </View>
                  <View style={styles.webAvailabilityGrid}>
                      {/* Başlık Satırı */} 
                      <View style={styles.webTableHeaderRow}>
                          <View style={[styles.webDayCell, styles.webHeaderCell]}><Text style={styles.webHeaderText}>Gün</Text></View>
                          {TIME_SLOTS.map(slot => (
                              <View key={slot.id} style={[styles.webSlotCell, styles.webHeaderCell]}>
                                   <Text style={styles.webHeaderText}>{slot.label}</Text>
                                   <Text style={styles.webHeaderTimeText}>{slot.time}</Text>
                                   <TouchableOpacity style={[styles.webColumnToggle, isTimeSlotAvailable(slot.id) ? styles.webColumnToggleAll : isTimeSlotUnavailable(slot.id) ? styles.webColumnToggleNone : styles.webColumnToggleMixed]} onPress={() => toggleTimeSlot(slot.id, !isTimeSlotAvailable(slot.id))}>
                                      <Ionicons name={isTimeSlotAvailable(slot.id) ? "remove" : "add"} size={14} color="#fff"/>
                                   </TouchableOpacity>
                              </View>
                          ))}
                      </View>
                      {/* Veri Satırları */} 
                      {DAYS.map(day => (
                          <View key={day} style={styles.webTableRow}>
                               <View style={styles.webDayCell}>
                                    <Text style={styles.webDayText}>{day}</Text>
                                   <TouchableOpacity style={[styles.webRowToggle, isDayAvailable(day) ? styles.webRowToggleAll : isDayUnavailable(day) ? styles.webRowToggleNone : styles.webRowToggleMixed]} onPress={() => toggleDay(day, !isDayAvailable(day))}>
                                      <Ionicons name={isDayAvailable(day) ? "remove" : "add"} size={14} color="#fff"/>
                                   </TouchableOpacity>
                               </View>
                               {TIME_SLOTS.map(slot => (
                                   <View key={`${day}-${slot.id}`} style={styles.webSlotCell}>
                  <Switch
                                         value={availability[day]?.[slot.id] ?? false}
                                         onValueChange={() => toggleAvailability(day, slot.id)}
                                         thumbColor={availability[day]?.[slot.id] ? '#6366F1' : '#f4f3f4'}
                                         trackColor={{ false: '#E5E7EB', true: 'rgba(99, 102, 241, 0.3)' }}
                    ios_backgroundColor="#E5E7EB"
                                         style={styles.webSwitch} // Web için stil uygulandı
                  />
                </View>
                               ))}
              </View>
            ))}
                  </View>
          </View>
          
              {/* Diğer Ayarlar Bölümü (İçerik Eklendi) */}
              <View style={styles.webSettingsRow}>
                   <View style={[styles.webSectionContainer, styles.webSettingCard]}>
                       <Text style={styles.webSectionTitle}>Özel Durumlar</Text>
                       <Text style={styles.webSectionDescription}>Tatil, izin gibi özel durumları ayarlayın.</Text>
                       <TouchableOpacity style={styles.webSettingButton} onPress={() => Alert.alert('Özel Tarihler','Bu özellik yakında eklenecektir.')}> 
                           <Ionicons name="calendar-outline" size={18} color="#4338CA" style={{marginRight: 6}}/> 
                           <Text style={styles.webSettingButtonText}>Özel Tarihleri Yönet</Text>
          </TouchableOpacity>
                   </View>
                   <View style={[styles.webSectionContainer, styles.webSettingCard]}>
                       <Text style={styles.webSectionTitle}>Randevu Süreleri</Text>
                       <Text style={styles.webSectionDescription}>Varsayılan seans ve ara süresini belirleyin.</Text>
                       <TouchableOpacity style={styles.webSettingButton} onPress={() => Alert.alert('Randevu Ayarları','Bu özellik yakında eklenecektir.')}>
                           <Ionicons name="time-outline" size={18} color="#4338CA" style={{marginRight: 6}}/> 
                           <Text style={styles.webSettingButtonText}>Randevu Ayarlarını Düzenle</Text>
                       </TouchableOpacity>
                   </View>
              </View>
      
               {/* Kaydet/İptal Butonları (İçerik Eklendi) */}
               <View style={styles.webButtonsContainer}>
                   <TouchableOpacity style={[styles.webButton, styles.webCancelButton]} onPress={handleBack} disabled={saving}>
                       <Text style={styles.webCancelButtonText}>İptal</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={[styles.webButton, styles.webSaveButton, (!changed || saving) && styles.webSaveButtonDisabled]} onPress={handleSave} disabled={!changed || saving}>
                      {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.webSaveButtonText}>Değişiklikleri Kaydet</Text>}
                   </TouchableOpacity>
               </View>
           </View>{/* webMaxContentWidth sonu */}
        </ScrollView>{/* ScrollView sonu */}
    </LinearGradient> // LinearGradient sonu
  );

  // Yükleme ve Hata Durumları (Ortak)
  if (loading) {
    return ( <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#9D6FF0" /><Text style={styles.loadingText}>Yükleniyor...</Text></View> );
  }
  if (error || !therapist) {
    return ( <View style={styles.errorContainer}><Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" /><Text style={styles.errorText}>{error || 'Terapist profili bulunamadı.'}</Text><TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/(tabs)/profile')}><Text style={styles.retryButtonText}>Geri Dön</Text></TouchableOpacity></View> );
  }

  // Platforma göre render et
  return Platform.select({
    web: renderWebLayout(),
    default: renderMobileLayout(),
  });
}

// --- StyleSheet --- 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
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
    textAlign: 'center',
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
  retryButton: {
    backgroundColor: '#9D6FF0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderButton: {
    width: 40,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  selectAllButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectAllText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
    maxWidth: '80%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 8,
    marginBottom: 8,
  },
  dayHeaderCell: {
    flex: 1.5,
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontWeight: '700',
    color: '#333',
    fontSize: 15,
  },
  slotHeaderCell: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 20, // Yer açmak için extra padding
  },
  slotHeaderText: {
    fontWeight: '600',
    color: '#333',
    fontSize: 13,
    textAlign: 'center',
  },
  slotTimeText: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  columnToggle: {
    position: 'absolute',
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnToggleAll: {
    backgroundColor: '#EF4444', // Kırmızı (tüm sütunu uygun değil yapmak için)
  },
  columnToggleNone: {
    backgroundColor: '#10B981', // Yeşil (tüm sütunu uygun yapmak için)
  },
  columnToggleMixed: {
    backgroundColor: '#6366F1', // Mor (karışık durum)
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  dayCell: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  rowToggle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowToggleAll: {
    backgroundColor: '#EF4444', // Kırmızı (tüm satırı uygun değil yapmak için)
  },
  rowToggleNone: {
    backgroundColor: '#10B981', // Yeşil (tüm satırı uygun yapmak için)
  },
  rowToggleMixed: {
    backgroundColor: '#6366F1', // Mor (karışık durum)
  },
  availabilityCell: {
    flex: 1,
    alignItems: 'center',
  },
  switch: {
    transform: [{ scaleX: Platform.OS === 'ios' ? 0.7 : 0.9 }, { scaleY: Platform.OS === 'ios' ? 0.7 : 0.9 }],
  },
  specialDatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  specialDatesIcon: {
    marginRight: 12,
  },
  specialDatesText: {
    flex: 1,
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
  appointmentSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  appointmentSettingsIcon: {
    marginRight: 12,
  },
  appointmentSettingsText: {
    flex: 1,
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#6366F1',
    marginLeft: 8,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  webScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  webBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  webSectionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  webSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  webSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  webSectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
    maxWidth: '80%',
  },
  webSelectAllButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  webSelectAllText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
  webAvailabilityGrid: {
    marginBottom: 16,
  },
  webTableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 8,
    marginBottom: 8,
  },
  webDayCell: {
    flex: 1.5,
    paddingVertical: 8,
  },
  webHeaderCell: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 20, // Yer açmak için extra padding
  },
  webHeaderText: {
    fontWeight: '700',
    color: '#333',
    fontSize: 15,
  },
  webHeaderTimeText: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  webTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    // paddingVertical: 12, // Kaldırıldı, hücreler kendi paddingini alır
    alignItems: 'center',
  },
  webDayText: {
    fontSize: 14,
    color: '#333',
  },
  webSlotCell: {
    flex: 1.5,
    alignItems: 'center',
    paddingVertical: 10, // Dikey boşluk
  },
  webColumnToggle: {
    position: 'absolute',
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webRowToggle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  webSwitch: { // Web için Switch stili (gerekirse)
     transform: [{ scale: 0.9 }], 
  },
  webSettingsRow: {
    flexDirection: 'row',
    gap: 25, // Kartlar arası boşluk
    marginBottom: 30,
    width: '100%',
  },
  webSettingCard: {
    flex: 1,
    // webSectionContainer stilini kullanır
  },
  webSettingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 'auto',
    justifyContent: 'center', // İçeriği ortala
  },
  webSettingButtonText: {
    color: '#4338CA', // Daha koyu mor
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  webButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Butonları sağa yasla
    marginTop: 20,
    width: '100%', // Konteyner genişliğini al
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  webButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Standart buton yüksekliği
    flex: 0, // İçeriğe göre genişlesin
    marginLeft: 12, // Butonlar arası boşluk
  },
  webCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  webCancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  webSaveButton: {
    backgroundColor: '#6366F1',
  },
  webSaveButtonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
    opacity: 0.7, // Daha belirgin disabled
  },
  webSaveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  webBackgroundGradient: {
    flex: 1,
  },
  webScrollContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    minHeight: '100%',
    flexGrow: 1,
  },
  webMaxContentWidth: {
    width: '100%',
    maxWidth: 960,
  },
  // Web Toggle Renkleri (Mobil ile aynı olabilir)
  webColumnToggleAll: {
    backgroundColor: '#EF4444', 
  },
  webColumnToggleNone: {
    backgroundColor: '#10B981', 
  },
  webColumnToggleMixed: {
    backgroundColor: '#6366F1', 
  },
  webRowToggleAll: {
    backgroundColor: '#EF4444',
  },
  webRowToggleNone: {
    backgroundColor: '#10B981',
  },
  webRowToggleMixed: {
    backgroundColor: '#6366F1',
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