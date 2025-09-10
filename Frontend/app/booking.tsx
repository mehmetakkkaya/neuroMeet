import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Dimensions,
  ViewStyle,
  TextStyle,
  ImageStyle
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api'; // Yol düzeltildi
import { Availability } from '../src/types/api.types'; // Yol düzeltildi
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars'; // Calendar importu
import { useGetBookedSlots } from '../src/hooks/useApi';
import { useGetTherapistSessionFee } from '../src/hooks/useApi'; // Yeni hook import edildi
import { LinearGradient } from 'expo-linear-gradient'; // Web arkaplanı için

// Varsayılan olarak kullanılacak saat aralıkları (API'den gelene kadar)
const DUMMY_TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00'];

interface AvailabilityData {
  weekday: Availability[];
  weekend: Availability[];
}

// Türkçe takvim ayarları (isteğe bağlı)
LocaleConfig.locales['tr'] = {
  monthNames: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'],
  today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

// Haftanın günlerini İngilizce'den Türkçe'ye çevirme (API yanıtına göre)
const dayMapping: { [key: string]: number } = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6
};

const { width } = Dimensions.get('window'); // Ekran genişliği

// Define types for styles for better type safety
interface BookingStyles {
  // Base & Mobile
  containerMobile: ViewStyle;
  scrollViewMobile: ViewStyle;
  centeredContainer: ViewStyle;
  loadingText: TextStyle;
  errorText: TextStyle;
  backButton: ViewStyle;
  backButtonText: TextStyle;
  header: ViewStyle;
  headerLeft: ViewStyle;
  headerRight: ViewStyle;
  therapistName: TextStyle;
  therapistSpecialty: TextStyle;
  priceText: TextStyle;
  contentContainerBase: ViewStyle;
  sectionTitleBase: TextStyle;
  calendarBase: ViewStyle;
  timeSlotsContainerBase: ViewStyle;
  timeSlotButtonBase: ViewStyle;
  timeSlotText: TextStyle;
  availableSlot: ViewStyle;
  availableSlotText: TextStyle;
  bookedSlot: ViewStyle;
  bookedSlotText: TextStyle;
  selectedSlot: ViewStyle;
  selectedSlotText: TextStyle;
  noSlotsTextBase: TextStyle;
  centeredSmallLoading: ViewStyle;
  smallLoadingText: TextStyle;
  bookButtonBase: ViewStyle;
  bookButtonText: TextStyle;
  disabledButton: ViewStyle;
  mobileBackButton: ViewStyle;
  // Web Specific
  webContainer: ViewStyle;
  webBackgroundGradient: ViewStyle;
  webScrollContent: ViewStyle;
  webMaxContentWidth: ViewStyle;
  webHeroSection: ViewStyle;
  webGreeting: TextStyle;
  webSubtitle: TextStyle;
  webPriceContainer: ViewStyle;
  webPriceText: TextStyle;
  webContentInner: ViewStyle;
  sectionTitleWeb: TextStyle;
  calendarWeb: ViewStyle;
  timeSlotsContainerWeb: ViewStyle;
  timeSlotButtonWeb: ViewStyle;
  noSlotsTextWeb: TextStyle;
  bookButtonWeb: ViewStyle;
  webTopBar: ViewStyle;
  webTopBarTitle: TextStyle;
  webProfileIcon: TextStyle;
}

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ therapistId: string; therapistName: string; therapistSpecialty?: string }>();
  // Parametreleri alırken null/undefined kontrolü yapalım
  const therapistId = params.therapistId;
  const therapistName = params.therapistName || 'Terapist';
  const therapistSpecialty = params.therapistSpecialty || 'Uzmanlık Alanı';

  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [loadingBookedSlots, setLoadingBookedSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // Seçili tarih ayrı tutuluyor
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Availability | null>(null); // Seçilen saat dilimi objesi (ID içerecek)
  const [availableSlotsForSelectedDate, setAvailableSlotsForSelectedDate] = useState<Availability[]>([]);
  const [bookedStartTimes, setBookedStartTimes] = useState<string[]>([]);
  const [fetchedSessionFee, setFetchedSessionFee] = useState<number | null | undefined>(undefined); // undefined: henüz çekilmedi

  // API Hook'ları
  const getBookedSlotsHook = useGetBookedSlots();
  const getSessionFeeHook = useGetTherapistSessionFee(); // Yeni hook kullanılıyor

  // Terapist müsaitliğini yükle ve işaretli günleri hazırla
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!therapistId) return;

      try {
        setLoadingAvailability(true);
        setError(null);
        const numericTherapistId = parseInt(therapistId, 10);
        if (isNaN(numericTherapistId)) throw new Error('Geçersiz Terapist ID formatı.');

        const data: AvailabilityData = await api.request(`/availability/${numericTherapistId}`);
        console.log("API Müsaitlik Yanıtı (Ham):", JSON.stringify(data, null, 2));
        setAvailabilityData(data);

        const allAvailabilities = [...(data?.weekday || []), ...(data?.weekend || [])];
        console.log("Birleştirilmiş Müsaitlikler:", JSON.stringify(allAvailabilities, null, 2));

        const marked: { [key: string]: any } = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const availableWeekdays = new Set(allAvailabilities.filter(a => a.isAvailable).map(a => a.dayOfWeek));
        console.log("Müsait Gün İsimleri (Set):", availableWeekdays);

        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setUTCHours(12, 0, 0, 0);
          date.setUTCDate(date.getUTCDate() + i);

          const dateString = date.toISOString().split('T')[0];

          const dayOfWeekNumber = Platform.OS === 'web' ? date.getUTCDay() : date.getDay();

          const dayOfWeekString = Object.keys(dayMapping).find(key => dayMapping[key] === dayOfWeekNumber);

          console.log(`Tarih: ${dateString}, GünNo(${Platform.OS}): ${dayOfWeekNumber}, GünStr: ${dayOfWeekString}, MüsaitMi: ${availableWeekdays.has(dayOfWeekString ?? '')}`);

          if (dayOfWeekString && availableWeekdays.has(dayOfWeekString)) {
             marked[dateString] = { marked: true, dotColor: '#6366F1' };
          } else {
             marked[dateString] = { disabled: true, disableTouchEvent: true };
          }
        }
        console.log("Oluşturulan markedDates:", JSON.stringify(marked, null, 2));
        setMarkedDates(marked);

      } catch (err) {
        console.error("Müsaitlik yüklenirken hata:", err);
        setError(err instanceof Error ? err.message : 'Müsaitlik bilgileri yüklenemedi.');
        setMarkedDates({}); // Hata durumunda işaretleri temizle
      } finally {
        setLoadingAvailability(false);
      }
    };

    if (therapistId) {
      fetchAvailability();
    } else {
      setLoadingAvailability(false);
      setError("Randevu almak için lütfen önce ana sayfadan bir terapist seçin.");
    }
  }, [therapistId]);

  // YENİ: Terapist ID'si değiştiğinde veya ilk yüklendiğinde seans ücretini çek
  useEffect(() => {
    const fetchSessionFee = async () => {
      if (!therapistId) {
        setFetchedSessionFee(null); // ID yoksa null yap
        return;
      }
      try {
        const numericTherapistId = parseInt(therapistId, 10);
        if (isNaN(numericTherapistId)) throw new Error('Geçersiz Terapist ID formatı.');
        
        // Hook'u kullanarak isteği yap
        const result = await getSessionFeeHook.request(numericTherapistId);
        setFetchedSessionFee(result?.sessionFee ?? null); // Gelen değeri veya null ata
      } catch (err) {
        console.error("Seans ücreti çekilirken hata:", err);
        setFetchedSessionFee(null); // Hata durumunda null yap
      }
    };

    fetchSessionFee();
  }, [therapistId]); // Sadece therapistId değiştiğinde çalışır

  // Seçili tarih veya terapist değiştiğinde dolu saatleri çek
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDate || !therapistId) {
        setBookedStartTimes([]);
        return;
      }
      setLoadingBookedSlots(true);
      try {
        const numericTherapistId = parseInt(therapistId, 10);
        if (isNaN(numericTherapistId)) throw new Error("Geçersiz terapist ID");

        const bookedSlotsResult: string[] = await getBookedSlotsHook.request(numericTherapistId, selectedDate);

        console.log("API Yanıtı (Ham - Dolu Saatler String[]):", JSON.stringify(bookedSlotsResult, null, 2));

        if (Array.isArray(bookedSlotsResult)) {
          const formattedBookedTimes = bookedSlotsResult
            .map(timeString => {
              if (timeString && typeof timeString === 'string' && timeString.includes(':')) {
                return timeString.substring(0, 5); // HH:mm
              }
              console.warn("Geçersiz veya beklenmedik saat formatı alındı:", timeString);
              return null;
            })
            .filter((time): time is string => time !== null);

          setBookedStartTimes(formattedBookedTimes);
          console.log("Kaydedilen Dolu Saatler (HH:mm):", formattedBookedTimes);
        } else {
           console.error("API'den beklenen dizi formatı gelmedi:", bookedSlotsResult);
           setBookedStartTimes([]);
        }

      } catch (err) {
        console.error("Dolu saatler çekilirken hata:", err);
        setBookedStartTimes([]);
      } finally {
        setLoadingBookedSlots(false);
      }
    };
    fetchBookedSlots();
  }, [selectedDate, therapistId]);

  // Tarih seçildiğinde çalışacak fonksiyon
  const onDayPress = (day: DateData) => {
    const dateString = day.dateString; // YYYY-MM-DD
    setSelectedDate(dateString);
    setSelectedTimeSlot(null); // Saat seçimini sıfırla
    setBookedStartTimes([]); // Dolu saatleri temizle (useEffect tetiklenecek)

    if (availabilityData) {
      const selectedDateObj = new Date(dateString);
      selectedDateObj.setHours(12,0,0,0);
      const dayOfWeekNumber = selectedDateObj.getDay();
      const dayOfWeekString = Object.keys(dayMapping).find(key => dayMapping[key] === dayOfWeekNumber);

      const allAvailabilities = [...(availabilityData.weekday || []), ...(availabilityData.weekend || [])];
      const slotsForDay = allAvailabilities.filter(slot =>
        slot.dayOfWeek === dayOfWeekString && slot.isAvailable
      );

      slotsForDay.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      setAvailableSlotsForSelectedDate(slotsForDay);
    } else {
      setAvailableSlotsForSelectedDate([]);
    }
  };

  // Randevu oluşturma fonksiyonu
  const handleBooking = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir tarih ve saat seçin.');
      return;
    }
    if (!therapistId) {
        Alert.alert('Hata', 'Terapist bilgisi bulunamadı.');
        return;
    }

    setBookingLoading(true);
    try {
      const numericTherapistId = parseInt(therapistId || '0', 10);
      if (isNaN(numericTherapistId) || !selectedTimeSlot) {
         throw new Error("Randevu bilgileri eksik.");
      }

      const requestBody = {
        therapistId: numericTherapistId,
        availabilityId: selectedTimeSlot.id,
        bookingDate: selectedDate,
        startTime: selectedTimeSlot.startTime,
        endTime: selectedTimeSlot.endTime,
        sessionType: 'video',
      };

      console.log('Randevu isteği gönderiliyor:', JSON.stringify(requestBody, null, 2));

      await api.request('/bookings', 'POST', requestBody);

      Alert.alert('Başarılı', 'Randevunuz başarıyla oluşturuldu!');
      router.back();

    } catch (err) {
      console.error("Randevu oluşturulurken hata:", err);
      let errorMessage = 'Randevu oluşturulamadı. Lütfen tekrar deneyin.';
      if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
           errorMessage = err.response.data.message as string;
      } else if (err instanceof Error) {
          errorMessage = err.message;
      }
      Alert.alert('Hata', errorMessage);
    } finally {
      setBookingLoading(false);
    }
  };

  // Mobil Header (sadece mobil layout'ta kullanılır)
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.therapistName}>{therapistName}</Text>
        <Text style={styles.therapistSpecialty}>{therapistSpecialty}</Text>
      </View>
      <View style={styles.headerRight}>
        <Ionicons name="cash-outline" size={22} color="#10B981" />
        <Text style={styles.priceText}>
          {getSessionFeeHook.loading ? '...' : 
           fetchedSessionFee !== null && fetchedSessionFee !== undefined 
            ? `₺${fetchedSessionFee}` 
            : '-'} 
        </Text>
      </View>
    </View>
  );

  // Ortak Takvim ve Saat Seçimi (Web/Mobil)
  const renderCalendarAndTimeSlots = () => {
    const currentMarkedDates = { ...markedDates };
    if (selectedDate) {
      currentMarkedDates[selectedDate] = {
        ...(currentMarkedDates[selectedDate] || {}),
        selected: true,
        selectedColor: '#6366F1',
        selectedTextColor: 'white'
      };
    }

    return (
      // Web için ek stil webContentInner ile sağlanır
      <View style={[styles.contentContainerBase, Platform.OS === 'web' && styles.webContentInner]}>
        {/* Başlık web/mobil farklı */}
        <Text style={[styles.sectionTitleBase, Platform.OS === 'web' && styles.sectionTitleWeb]}>
          Tarih Seçin
        </Text>
        <Calendar
          // Takvim web/mobil farklı
          style={[styles.calendarBase, Platform.OS === 'web' && styles.calendarWeb]}
          onDayPress={onDayPress}
          markedDates={currentMarkedDates}
          monthFormat={'MMMM yyyy'}
          minDate={new Date().toISOString().split('T')[0]}
          firstDay={1}
          theme={{
             backgroundColor: 'transparent',
             calendarBackground: '#FFFFFF',
             selectedDayBackgroundColor: '#8B5CF6',
             selectedDayTextColor: '#ffffff',
             todayTextColor: '#A78BFA',
             todayBackgroundColor: '#F5F3FF',
             dayTextColor: '#374151',
             textDisabledColor: '#E5E7EB',
             dotColor: '#8B5CF6',
             selectedDotColor: '#ffffff',
             arrowColor: '#8B5CF6',
             monthTextColor: '#1F2937',
             indicatorColor: '#8B5CF6',
             textDayFontWeight: '400',
             textMonthFontWeight: '700',
             textDayHeaderFontWeight: '600',
             textDayFontSize: 15,
             textMonthFontSize: 18,
             textDayHeaderFontSize: 13,
          }}
        />

        {selectedDate && (
          <>
            <Text style={[styles.sectionTitleBase, Platform.OS === 'web' && styles.sectionTitleWeb, { marginTop: Platform.OS === 'web' ? 30 : 10 }]}>
              🕒 Saat Seçin
            </Text>
            {loadingBookedSlots &&
              <View style={styles.centeredSmallLoading}>
                 <ActivityIndicator color="#6366F1" />
                 <Text style={styles.smallLoadingText}>Uygun saatler kontrol ediliyor...</Text>
              </View>
            }

            {!loadingBookedSlots && availableSlotsForSelectedDate.length > 0 ? (
              // Saat container web/mobil farklı
              <View style={[styles.timeSlotsContainerBase, Platform.OS === 'web' && styles.timeSlotsContainerWeb]}>
                {availableSlotsForSelectedDate.map((slot) => {
                  const startTime = slot.startTime.substring(0, 5);
                  const isBooked = bookedStartTimes.includes(startTime);
                  const isSelected = selectedTimeSlot?.id === slot.id;

                  return (
                    <TouchableOpacity
                      key={slot.id}
                      // Saat butonu web/mobil farklı
                      style={[
                        styles.timeSlotButtonBase,
                        Platform.OS === 'web' && styles.timeSlotButtonWeb,
                        isBooked ? styles.bookedSlot :
                        isSelected ? styles.selectedSlot :
                        styles.availableSlot
                      ]}
                      onPress={() => {
                        console.log("Seçilen Saat Slotu:", JSON.stringify(slot, null, 2));
                        setSelectedTimeSlot(slot);
                      }}
                      disabled={isBooked}
                    >
                      <Text style={[
                         styles.timeSlotText,
                         isBooked ? styles.bookedSlotText :
                         isSelected ? styles.selectedSlotText :
                         styles.availableSlotText
                      ]}>
                        {startTime}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              !loadingBookedSlots && (
                // No slots text web/mobil farklı
                <Text style={[styles.noSlotsTextBase, Platform.OS === 'web' && styles.noSlotsTextWeb]}>
                  Seçili tarih için uygun saat bulunamadı.
                </Text>
              )
            )}
          </>
        )}
      </View>
    );
  };

  // Ortak Onay Butonu (Web/Mobil)
  const renderBookingButton = () => (
    <TouchableOpacity
      // Buton web/mobil farklı
      style={[
        styles.bookButtonBase,
        Platform.OS === 'web' && styles.bookButtonWeb,
        (!selectedDate || !selectedTimeSlot || bookingLoading) && styles.disabledButton
      ]}
      onPress={handleBooking}
      disabled={!selectedDate || !selectedTimeSlot || bookingLoading}
    >
      {bookingLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.bookButtonText}>Randevuyu Onayla</Text>
      )}
    </TouchableOpacity>
  );

  // --- Ana Layout Render Fonksiyonları ---

  // Mobil Layout
  const renderMobileLayout = () => (
    <SafeAreaView style={styles.containerMobile}>
      <Stack.Screen
        options={{
          title: `Randevu Al: ${therapistName}`,
          headerShown: false, // Mobil için özel header ve geri butonu var
        }}
      />
      {/* Mobil Geri Butonu */} 
      <TouchableOpacity style={styles.mobileBackButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-circle-outline" size={32} color="#555" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollViewMobile}>
        {renderHeader()} // Mobil header
        {renderCalendarAndTimeSlots()} // Ortak içerik
        {renderBookingButton()} // Ortak buton
      </ScrollView>
    </SafeAreaView>
  );

  // Web Layout
  const renderWebLayout = () => (
    <LinearGradient
      colors={['#A78BFA', '#D8B4FE', '#F5F3FF']} // Anasayfa ile aynı gradient
      style={styles.webBackgroundGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* --- YENİ: Web Üst Barı --- */}
      <View style={styles.webTopBar}> 
            <TouchableOpacity onPress={() => router.push('/')}> 
              <Text style={styles.webTopBarTitle}>NeuroMeet</Text> 
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.navigate('/(tabs)/profile')}> 
              {/* Profil ikonuna tıklayınca ana profil sayfasına yönlendir */}
              <Ionicons name="person-circle-outline" size={32} color="white" style={styles.webProfileIcon} /> 
            </TouchableOpacity>
       </View>
      {/* --- Bitiş: Web Üst Barı --- */}
      <View style={styles.webContainer}>
        {/* Web için Stack Screen header kullanılır */}
        <Stack.Screen options={{ title: `Randevu Al: ${therapistName}`, headerBackVisible: true, headerTitleAlign: 'center', headerStyle: { backgroundColor: 'transparent'}, headerShadowVisible: false }} />
        {/* ScrollView'a paddingTop eklendi - Topbar yüksekliği kadar */}
        <ScrollView contentContainerStyle={styles.webScrollContent} style={{ paddingTop: 75 }}> 
          <View style={styles.webMaxContentWidth}>
            {/* Web için Hero Alanı */} 
            <View style={styles.webHeroSection}>
               <Text style={styles.webGreeting}>{therapistName}'ndan Randevu Al!</Text>
               <Text style={styles.webSubtitle}>{therapistSpecialty}</Text>
               <View style={styles.webPriceContainer}>
                 <Ionicons name="cash-outline" size={20} color="#10B981" />
                 <Text style={styles.webPriceText}>
                   {getSessionFeeHook.loading ? 'Yükleniyor...' : 
                    fetchedSessionFee !== null && fetchedSessionFee !== undefined 
                      ? `₺${fetchedSessionFee}` 
                      : '-'} 
                 </Text>
               </View>
            </View>

            {renderCalendarAndTimeSlots()} 
            {renderBookingButton()} 
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );

  // --- Yükleme ve Hata Durumları (Ortak) ---
  if (loadingAvailability) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Müsaitlik durumu yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Ana Render ---
  return Platform.select({
    web: renderWebLayout(),
    default: renderMobileLayout(),
  });
}

// --- Stil Tanımlamaları --- 

const styles = StyleSheet.create<BookingStyles>({
  // --- TEMEL & MOBİL STİLLER --- 
  containerMobile: { // Sadece mobil için SafeAreaView
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollViewMobile: {
    flex: 1,
  },
  centeredContainer: { // Yükleme/Hata ekranı için ortak
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  backButton: { // Hata ekranı geri butonu
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: { // Mobil Header
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    marginRight: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  therapistName: { // Mobil Header Terapist Adı
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#333',
  },
  therapistSpecialty: { // Mobil Header Uzmanlık
    fontSize: 15,
    color: '#666',
  },
  priceText: { // Mobil Header Fiyat
    fontSize: 16,
    fontWeight: '600',
    color: '#00796B',
    marginLeft: 6,
  },
  contentContainerBase: { // Ortak içerik alanı (mobil padding)
    padding: 20,
  },
  sectionTitleBase: { // Ortak bölüm başlığı (mobil stil)
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
    color: '#444',
  },
  calendarBase: { // Ortak takvim stili (mobil stil)
    marginBottom: 25,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    overflow: 'hidden',
  },
  timeSlotsContainerBase: { // Ortak saat aralıkları (mobil stil)
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 5,
    justifyContent: 'flex-start', // Mobil sola yaslı
  },
  timeSlotButtonBase: { // Ortak saat butonu (mobil stil)
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: '30%', // Mobil % genişlik
    flexGrow: 1, // Mobil boşlukları doldur
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeSlotText: { // Saat yazısı (ortak)
    fontSize: 15,
    fontWeight: '600',
  },
  availableSlot: { // Müsait (ortak)
    backgroundColor: '#F0FFF4',
    borderColor: '#9AE6B4',
  },
  availableSlotText: { // Müsait yazı (ortak)
     color: '#2F855A',
  },
  bookedSlot: { // Dolu (ortak)
    backgroundColor: '#FFF5F5',
    borderColor: '#FEB2B2',
    opacity: 0.7,
  },
  bookedSlotText: { // Dolu yazı (ortak)
     color: '#C53030',
     textDecorationLine: 'line-through',
  },
  selectedSlot: { // Seçili (ortak)
    backgroundColor: '#6366F1',
    borderColor: '#4338CA',
    shadowColor: "#6366F1",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  selectedSlotText: { // Seçili yazı (ortak)
     color: 'white',
     fontWeight: 'bold',
  },
  noSlotsTextBase: { // Uygun saat yok (mobil stil)
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  centeredSmallLoading: { // Saatler yükleniyor (ortak)
     flexDirection: 'row',
     justifyContent: 'center',
     alignItems: 'center',
     paddingVertical: 15,
  },
  smallLoadingText: { // Saatler yükleniyor yazı (ortak)
     marginLeft: 10,
     color: '#666',
     fontSize: 14,
  },
  bookButtonBase: { // Ortak onay butonu (mobil stil)
    backgroundColor: '#6366F1',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20, // Mobil yatay margin
    marginBottom: 20, // Mobil alt margin
    marginTop: 10, // Mobil üst margin
    alignItems: 'center',
    minHeight: 50,
    alignSelf: 'stretch', // Mobil genişle
  },
  bookButtonText: { // Onay butonu yazı (ortak)
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: { // Pasif buton (ortak)
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  mobileBackButton: { // Mobil geri butonu
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 40, // Biraz aşağı aldık
      left: 15,
      zIndex: 10,
      padding: 5,
      backgroundColor: 'rgba(255,255,255,0.6)', // Görünürlük için hafif arka plan
      borderRadius: 20, // Yuvarlak
  },

  // --- WEB'E ÖZEL STİLLER --- (Anasayfadan ilham alınarak)
  webContainer: { // Web ana sarmalayıcı (Gradient içinde)
    flex: 1,
    backgroundColor: 'transparent',
  },
  webBackgroundGradient: { // Web arka plan gradient
    flex: 1,
  },
  webScrollContent: { // Web ScrollView içerik sarmalayıcı
    paddingVertical: 50,
    paddingHorizontal: '5%',
    alignItems: 'center',
    flexGrow: 1,
  },
  webMaxContentWidth: { // Web içerik maksimum genişliği
    width: '100%',
    maxWidth: 800,
    flex: 1,
    justifyContent: 'flex-start',
    flexDirection: 'column',
  },
  webHeroSection: { // Web başlık (Hero) alanı
    width: '100%',
    paddingVertical: 30,
    paddingHorizontal: 25,
    marginBottom: 30,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
    alignItems: 'center',
  },
  webGreeting: { // Web başlık yazısı
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
    textAlign: 'center',
  },
  webSubtitle: { // Web alt başlık (Uzmanlık)
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 15,
    textAlign: 'center',
  },
  webPriceContainer: { // Web fiyat gösterimi
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  webPriceText: { // Web fiyat yazısı
    fontSize: 15,
    fontWeight: '600',
    color: '#00796B',
    marginLeft: 5,
  },
  webContentInner: { // Takvim ve Saatleri içeren web sarmalayıcı
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30, // Web'de daha fazla iç boşluk
    marginBottom: 30,
    shadowColor: "rgba(0, 0, 0, 0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitleWeb: { // Web bölüm başlığı stili
    fontSize: 22,
    textAlign: 'center',
    color: '#1F2937',
    marginTop: 0, // webContentInner padding'i var zaten
    marginBottom: 25,
  },
  calendarWeb: { // Web takvim ek stili
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeSlotsContainerWeb: { // Web saat container ek stili
    justifyContent: 'center',
  },
  timeSlotButtonWeb: { // Web saat butonu ek stili
    minWidth: 110, // Sabit genişlik
    flexGrow: 0, // Büyümesin
  },
  noSlotsTextWeb: { // Web uygun saat yok ek stili
    paddingVertical: 20,
  },
  bookButtonWeb: { // Web onay butonu ek stili
    marginHorizontal: 0,
    marginBottom: 30,
    marginTop: 30,
    alignSelf: 'center',
    width: '60%',
    maxWidth: 400,
  },

  // --- Web Top Bar Stilleri (therapist.tsx'ten eklendi) --- 
  webTopBar: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 75, // Yüksekliği ayarlayabilirsin
    backgroundColor: '#6366F1', // Terapist profilindekiyle aynı renk
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40, // Yatay boşluk
    zIndex: 10, // Diğer içeriklerin üzerinde kalması için
  },
  webTopBarTitle: { 
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  webProfileIcon: { 
    opacity: 0.9, 
  },
  // --- Bitiş: Web Top Bar Stilleri --- 
});