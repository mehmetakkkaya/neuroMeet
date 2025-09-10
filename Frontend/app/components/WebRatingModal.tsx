import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Image,
  ScrollView // Web'de içeriğin kaydırılması gerekebilir
} from 'react-native';
import Modal from 'react-native-modal'; // react-native-modal web'de de çalışabilir
import { Ionicons } from '@expo/vector-icons';
// import { Rating as StarRating } from 'react-native-ratings'; // Veya web için farklı bir kütüphane?

import { useGetNotRatedBookings, useSubmitRating } from '../../src/hooks/useApi';
import { NotRatedBooking, SubmitRatingRequest, Rating } from '../../src/types/api.types';

interface WebRatingModalProps {
  isVisible: boolean;
  onClose: () => void;
  userId: number | null;
}

const { width, height } = Dimensions.get('window');

export default function WebRatingModal({ isVisible, onClose, userId }: WebRatingModalProps) {
  const [bookings, setBookings] = useState<NotRatedBooking[]>([]);
  const [ratings, setRatings] = useState<{ [id: number]: number }>({});
  const [comments, setComments] = useState<{ [id: number]: string }>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // API Hooks (Mobil ile aynı)
  const { 
    data: fetchedBookings, 
    loading: loadingBookings, 
    error: bookingsError, 
    request: getBookings 
  } = useGetNotRatedBookings();
  
  const { 
    loading: submittingRating, 
    error: submitError, 
    request: submitRating 
  } = useSubmitRating();

  // Effect'ler (Mobil ile aynı)
  useEffect(() => {
    if (isVisible && userId) {
      console.log(`(Web) Puanlanmamış bookingler çekiliyor: userId=${userId}`);
      getBookings(userId);
    } else {
      setBookings([]);
      setRatings({});
      setComments({});
      setSubmittingId(null);
    }
  }, [isVisible, userId]);

  useEffect(() => {
    if (fetchedBookings) {
      console.log(">>> (Web) Fetched Bookings Data:", JSON.stringify(fetchedBookings, null, 2));
      setBookings(fetchedBookings);
    }
  }, [fetchedBookings]);

  useEffect(() => {
    if (bookingsError) {
      Alert.alert('Hata', 'Puanlanacak randevular yüklenirken bir sorun oluştu.');
      console.error("(Web) getNotRatedBookings Hatası:", bookingsError);
    }
  }, [bookingsError]);

  useEffect(() => {
    if (submitError) {
      Alert.alert('Hata', 'Puanınız gönderilirken bir sorun oluştu.');
      console.error("(Web) submitRating Hatası:", submitError);
      setSubmittingId(null);
    }
  }, [submitError]);

  // Handler Fonksiyonları (Mobil ile aynı)
  const handleRatingChange = (id: number, rating: number) => {
    setRatings(prev => ({ ...prev, [id]: rating }));
  };

  const handleCommentChange = (id: number, comment: string) => {
    setComments(prev => ({ ...prev, [id]: comment }));
  };

  const handleSubmitRating = async (booking: NotRatedBooking) => {
    const ratingValue = ratings[booking.id];
    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
      Alert.alert('Eksik Bilgi', 'Lütfen 1 ile 5 arasında bir puan seçin.');
      return;
    }
    const commentValue = comments[booking.id] || '';
    const ratingData: SubmitRatingRequest = {
      bookingId: booking.id,
      rating: ratingValue,
      comment: commentValue.trim() || undefined,
    };
    setSubmittingId(booking.id);
    try {
      const result = await submitRating(ratingData);
      console.log('(Web) Puanlama başarılı:', result);
      Alert.alert('Teşekkürler!', 'Değerlendirmeniz başarıyla gönderildi.');
      setBookings(prev => prev.filter(b => b.id !== booking.id));
      setRatings(prev => { const newState = {...prev}; delete newState[booking.id]; return newState; });
      setComments(prev => { const newState = {...prev}; delete newState[booking.id]; return newState; });
    } catch (err) {
      // Hata mesajı useEffect içinde gösteriliyor
    } finally {
      setSubmittingId(null);
    }
  };

  // Liste elemanını render etme (Stiller web'e özel olacak)
  const renderBookingItem = ({ item }: { item: NotRatedBooking }) => {
    const currentRating = ratings[item.id] || 0;
    const currentComment = comments[item.id] || '';
    const isSubmittingThis = submittingId === item.id;

    return (
      <View style={styles.itemContainerWeb}>
        <View style={styles.itemHeaderWeb}>
            <Image 
              source={{ uri: item.therapist.profilePicture || 'https://via.placeholder.com/40' }}
              style={styles.therapistImageWeb}
            />
            <View style={styles.therapistInfoWeb}>
              <Text style={styles.therapistNameWeb}>{item.therapist.name}</Text>
              <Text style={styles.sessionDateWeb}>
                {new Date(item.sessionDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })} - {item.startTime.substring(0, 5)}
              </Text>
            </View>
        </View>
        
        <View style={styles.ratingCommentContainerWeb}>
          <View style={styles.ratingSectionWeb}>
            <Text style={styles.ratingLabelWeb}>Puanınız:</Text>
            <View style={styles.starsContainerWeb}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => handleRatingChange(item.id, star)} style={styles.starButtonWeb as any}>
                  <Ionicons 
                    name={star <= currentRating ? 'star' : 'star-outline'} 
                    size={28} // Web için biraz daha küçük olabilir
                    color={star <= currentRating ? '#FFC107' : '#ccc'} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.commentSectionWeb}>
            <Text style={styles.commentLabelWeb}>Yorumunuz (Opsiyonel):</Text>
            <TextInput
              style={styles.commentInputWeb}
              placeholder="Deneyiminizi paylaşın..."
              value={currentComment}
              onChangeText={(text) => handleCommentChange(item.id, text)}
              multiline
              editable={!isSubmittingThis}
              numberOfLines={3} // Web'de başlangıç yüksekliği
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButtonWeb, (isSubmittingThis || submittingRating) && styles.submitButtonDisabledWeb]}
          onPress={() => handleSubmitRating(item)}
          disabled={isSubmittingThis || submittingRating}
        >
          {isSubmittingThis ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonTextWeb}>Gönder</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose} // Arka plana tıklayınca kapat
      // swipeDirection={undefined} // Web'de swipe anlamsız
      style={styles.modalWeb} // Web'e özel stil
      animationIn="fadeIn" // Web animasyonları
      animationOut="fadeOut"
      backdropOpacity={0.4}
    >
      {/* Web için ScrollView ekleyelim, içerik sığmazsa kaydırılsın */} 
      <ScrollView style={styles.scrollViewWeb}>
        <View style={styles.modalContentContainerWeb}>
          <View style={styles.modalHeaderWeb}>
            <Text style={styles.modalTitleWeb}>Geçmiş Randevuları Değerlendir</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButtonWeb}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loadingBookings ? (
            <View style={styles.centeredMessageWeb}><ActivityIndicator size="large" color="#6366F1" /></View>
          ) : bookings.length === 0 ? (
            <View style={styles.centeredMessageWeb}>
              <Ionicons name="checkmark-done-outline" size={50} color="#4CAF50" style={{marginBottom: 15}} />
              <Text style={styles.noSessionsTextWeb}>Değerlendirilecek geçmiş randevunuz bulunmuyor.</Text>
            </View>
          ) : (
            // FlatList yerine doğrudan map kullanmak web'de daha basit olabilir
            // veya FlatList'e web için stil vermek gerekebilir.
            <FlatList
              data={bookings}
              renderItem={renderBookingItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContainerWeb}
            />
            /* 
            bookings.map(item => renderBookingItem({ item })) 
            */
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}

// Web için stiller mobil versiyondan farklı olacak
const styles = StyleSheet.create({
  modalWeb: {
    justifyContent: 'center',
    alignItems: 'center', // Ortala
    margin: 0, // Kenar boşluklarını sıfırla (react-native-modal zaten ayarlar)
  },
  scrollViewWeb: { // Modalın içindeki kaydırma alanı
    width: '70%', // Genişlik
    maxWidth: 700, // Maksimum genişlik
    maxHeight: '85%', // Maksimum yükseklik
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalContentContainerWeb: { // Kaydırma içeriği
     padding: 30, 
  },
  modalHeaderWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitleWeb: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  closeButtonWeb: {
    padding: 8,
    borderRadius: 15,
    backgroundColor: '#eee',
  },
  centeredMessageWeb: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  noSessionsTextWeb: {
    fontSize: 17,
    color: '#555',
    textAlign: 'center',
  },
  listContainerWeb: { // FlatList için container stili
     paddingBottom: 20,
  },
  itemContainerWeb: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    // Gölge yerine kenarlık kullanmak web'de daha yaygın olabilir
    // boxShadow: '0px 3px 5px rgba(0,0,0,0.07)', 
  },
  itemHeaderWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  therapistImageWeb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#eee',
  },
  therapistInfoWeb: {
    flex: 1,
  },
  therapistNameWeb: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  sessionDateWeb: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  ratingCommentContainerWeb: { // Puan ve yorumu yan yana koymak için (isteğe bağlı)
    flexDirection: 'row',
    // flexWrap: 'wrap', // Ekran daralırsa alt alta geçebilir
    gap: 20, // Aradaki boşluk
    marginBottom: 15,
    marginTop: 5,
  },
  ratingSectionWeb: {
    flex: 1, // Esnek genişlik
    minWidth: 200, // Minimum genişlik
  },
  commentSectionWeb: {
    flex: 2, // Yorum alanı daha geniş olabilir
    minWidth: 250,
  },
  ratingLabelWeb: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
    marginBottom: 10,
  },
  starsContainerWeb: {
    flexDirection: 'row',
  },
  starButtonWeb: {
    marginRight: 6,
    padding: 4,
  },
  commentLabelWeb: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
    marginBottom: 10,
  },
  commentInputWeb: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    width: '100%',
    minHeight: 70,
  },
  submitButtonWeb: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 6,
    alignItems: 'center',
    alignSelf: 'flex-end', // Sağa yasla
    marginTop: 10, // Yorum alanından sonra boşluk
  },
  submitButtonDisabledWeb: {
    backgroundColor: '#ccc',
  },
  submitButtonTextWeb: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
