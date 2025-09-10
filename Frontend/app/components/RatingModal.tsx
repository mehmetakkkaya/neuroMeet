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
  Image
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
// Henüz yüklenmediyse: expo install react-native-ratings
// import { Rating as ستارRating } from 'react-native-ratings'; // Yıldız puanlama için

import { useGetNotRatedBookings, useSubmitRating } from '../../src/hooks/useApi';
import { NotRatedBooking, SubmitRatingRequest, Rating } from '../../src/types/api.types';

interface RatingModalProps {
  isVisible: boolean;
  onClose: () => void;
  userId: number | null; // Değerlendirilecek kullanıcının ID'si
}

const { width, height } = Dimensions.get('window');

export default function RatingModal({ isVisible, onClose, userId }: RatingModalProps) {
  const [bookings, setBookings] = useState<NotRatedBooking[]>([]);
  // State anahtarları booking'in ID'si olacak (artık 'id')
  const [ratings, setRatings] = useState<{ [id: number]: number }>({});
  const [comments, setComments] = useState<{ [id: number]: string }>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null); // submittingBookingId -> submittingId

  // API Hooks
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

  // Modal görünür olduğunda ve userId varsa seansları çek
  useEffect(() => {
    if (isVisible && userId) {
      console.log(`Puanlanmamış bookingler çekiliyor: userId=${userId}`);
      getBookings(userId);
    } else {
      // Modal kapandığında veya userId yoksa state'leri sıfırla
      setBookings([]);
      setRatings({});
      setComments({});
      setSubmittingId(null); // submittingBookingId -> submittingId
    }
  }, [isVisible, userId]);

  // API'den gelen seansları state'e aktar
  useEffect(() => {
    if (fetchedBookings) {
      setBookings(fetchedBookings);
    }
  }, [fetchedBookings]);

  // Hata yönetimi
  useEffect(() => {
    if (bookingsError) {
      Alert.alert('Hata', 'Puanlanacak randevular yüklenirken bir sorun oluştu.');
      console.error("getNotRatedBookings Hatası:", bookingsError);
    }
  }, [bookingsError]);

  useEffect(() => {
    if (submitError) {
      Alert.alert('Hata', 'Puanınız gönderilirken bir sorun oluştu.');
      console.error("submitRating Hatası:", submitError);
      setSubmittingId(null); // submittingBookingId -> submittingId
    }
  }, [submitError]);

  // Yıldız puanını güncelleme fonksiyonu
  const handleRatingChange = (id: number, rating: number) => { // bookingId -> id
    setRatings(prev => ({ ...prev, [id]: rating })); // bookingId -> id
  };

  // Yorumu güncelleme fonksiyonu
  const handleCommentChange = (id: number, comment: string) => { // bookingId -> id
    setComments(prev => ({ ...prev, [id]: comment })); // bookingId -> id
  };

  // Puanı gönderme fonksiyonu
  const handleSubmitRating = async (booking: NotRatedBooking) => {
    const ratingValue = ratings[booking.id]; // bookingId -> id
    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
      Alert.alert('Eksik Bilgi', 'Lütfen 1 ile 5 arasında bir puan seçin.');
      return;
    }

    const commentValue = comments[booking.id] || ''; // bookingId -> id
    
    const ratingData: SubmitRatingRequest = {
      bookingId: booking.id, // API bookingId beklediği için burada item.id'yi kullanıyoruz
      rating: ratingValue,
      comment: commentValue.trim() || undefined,
      // isAnonymous: false, // Varsayılan veya kullanıcıya seçenek sunulabilir
    };

    setSubmittingId(booking.id); // submittingBookingId -> submittingId
    try {
      const result = await submitRating(ratingData);
      console.log('Puanlama başarılı:', result);
      Alert.alert('Teşekkürler!', 'Değerlendirmeniz başarıyla gönderildi.');
      // Başarılı gönderim sonrası o booking'i listeden kaldır
      setBookings(prev => prev.filter(b => b.id !== booking.id)); // bookingId -> id
      // İlgili state'leri temizle
      setRatings(prev => { const newState = {...prev}; delete newState[booking.id]; return newState; });
      setComments(prev => { const newState = {...prev}; delete newState[booking.id]; return newState; });
    } catch (err) {
      // Hata mesajı useEffect içinde gösteriliyor
    } finally {
      setSubmittingId(null); // submittingBookingId -> submittingId
    }
  };

  // Liste elemanını render etme
  const renderBookingItem = ({ item }: { item: NotRatedBooking }) => {
    const currentRating = ratings[item.id] || 0;
    const currentComment = comments[item.id] || '';
    const isSubmittingThis = submittingId === item.id;

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemHeader}>
            <Image 
              source={{ uri: item.therapist.profilePicture || 'https://via.placeholder.com/40' }}
              style={styles.therapistImage}
            />
            <View style={styles.therapistInfo}>
              <Text style={styles.therapistName}>{item.therapist.name}</Text>
              <Text style={styles.sessionDate}>
                {new Date(item.sessionDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })} - {item.startTime.substring(0, 5)}
              </Text>
            </View>
        </View>
        
        <Text style={styles.ratingLabel}>Puanınız:</Text>
        {/* Basit Butonlarla Yıldız Seçimi (react-native-ratings entegre edilebilir) */}
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => handleRatingChange(item.id, star)} style={styles.starButton}>
              <Ionicons 
                name={star <= currentRating ? 'star' : 'star-outline'} 
                size={30} 
                color={star <= currentRating ? '#FFC107' : '#ccc'} 
              />
            </TouchableOpacity>
          ))}
        </View>
        {/* 
        <StarRating
          rating={currentRating}
          onRatingFinish={(rating) => handleRatingChange(item.bookingId, rating)}
          imageSize={30}
          style={{ paddingVertical: 10, alignSelf: 'flex-start' }}
        />
        */}

        <Text style={styles.commentLabel}>Yorumunuz (Opsiyonel):</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Deneyiminizi paylaşın..."
          value={currentComment}
          onChangeText={(text) => handleCommentChange(item.id, text)}
          multiline
          editable={!isSubmittingThis}
        />

        <TouchableOpacity 
          style={[styles.submitButton, (isSubmittingThis || submittingRating) && styles.submitButtonDisabled]}
          onPress={() => handleSubmitRating(item)}
          disabled={isSubmittingThis || submittingRating}
        >
          {isSubmittingThis ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Gönder</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
      propagateSwipe
    >
      <View style={styles.modalContentContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Geçmiş Randevuları Değerlendir</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#666" />
          </TouchableOpacity>
        </View>

        {loadingBookings ? (
          <View style={styles.centeredMessage}><ActivityIndicator size="large" color="#6366F1" /></View>
        ) : bookings.length === 0 ? (
          <View style={styles.centeredMessage}>
            <Ionicons name="checkmark-done-outline" size={64} color="#4CAF50" style={{marginBottom: 15}} />
            <Text style={styles.noSessionsText}>Değerlendirilecek geçmiş randevunuz bulunmuyor.</Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            renderItem={renderBookingItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContentContainer: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.85, // Ekranın %85'i
    paddingTop: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSessionsText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 30,
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  therapistImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
    backgroundColor: '#eee',
  },
   therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sessionDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  starButton: {
    marginRight: 5, // Yıldızlar arası boşluk
    padding: 3,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
    marginTop: 5,
  },
  commentInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 15,
    textAlignVertical: 'top', // Android için
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
