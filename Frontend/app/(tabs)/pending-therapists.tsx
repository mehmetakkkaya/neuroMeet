import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../../src/services/api'; // API servisimiz
import { TherapistUser } from '../../src/types/api.types';

export default function PendingTherapistsScreen() {
  const router = useRouter();
  const [pendingTherapists, setPendingTherapists] = useState<TherapistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingTherapists();
  }, []);

  const fetchPendingTherapists = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log('[fetchPendingTherapists] İstek başlıyor...'); // Başlangıç logu
      const response = await api.users.getPendingTherapists(); 
      console.log('[fetchPendingTherapists] Ham API yanıtı:', JSON.stringify(response, null, 2)); // Ham yanıtı logla

      // API yanıtının users dizisini kontrol et yerine doğrudan dizi olup olmadığını kontrol et
      if (Array.isArray(response)) {
        // Gelen veriyi TherapistUser[] tipine cast et
        setPendingTherapists(response as TherapistUser[]);
      } else {
        console.warn('API yanıtı beklenen dizi formatında değil:', response);
        setPendingTherapists([]);
      }
    } catch (err: any) {
      console.error('Bekleyen terapistler çekilirken hata:', err);
      setError('Terapistler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (therapistId: number) => {
    // Onaylama API çağrısı
    try {
      setLoading(true); // İşlem başladığında yükleniyor durumunu aktif et
      console.log(`Terapist ${therapistId} onaylanıyor...`);
      await api.users.approveTherapist(therapistId); 
      console.log(`Terapist ${therapistId} başarıyla onaylandı.`);
      Alert.alert('Başarılı', 'Terapist başarıyla onaylandı.');
      // Başarılı olursa listeyi yenile
      fetchPendingTherapists(); 
    } catch (err: any) {
      console.error(`Terapist ${therapistId} onaylanırken hata:`, err);
      Alert.alert('Hata', err.message || 'Terapist onaylanırken bir hata oluştu.');
    } finally {
      setLoading(false); // İşlem bitince yükleniyor durumunu kapat
    }
  };

  const handleReject = async (therapistId: number) => {
    // Reddetme API çağrısı
    try {
      setLoading(true); // İşlem başladığında yükleniyor durumunu aktif et
      console.log(`Terapist ${therapistId} reddediliyor...`);
      await api.users.rejectTherapist(therapistId);
      console.log(`Terapist ${therapistId} başarıyla reddedildi.`);
      Alert.alert('Başarılı', 'Terapist başarıyla reddedildi.');
      // Başarılı olursa listeyi yenile
      fetchPendingTherapists();
    } catch (err: any) {
      console.error(`Terapist ${therapistId} reddedilirken hata:`, err);
      Alert.alert('Hata', err.message || 'Terapist reddedilirken bir hata oluştu.');
    } finally {
      setLoading(false); // İşlem bitince yükleniyor durumunu kapat
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingTherapists();
  };

  const renderTherapistItem = ({ item }: { item: TherapistUser }) => (
    <View style={styles.therapistCard}>
      <View style={styles.therapistInfo}>
        <Text style={styles.therapistName}>{item.name}</Text>
        <Text style={styles.therapistEmail}>{item.email}</Text>
        <Text style={styles.therapistPhone}>Telefon: {item.phone || '-'}</Text>
        <Text style={styles.therapistDetails}>Doğum Tarihi: {item.dateOfBirth || '-'} | Cinsiyet: {item.gender || '-'}</Text>
        <Text style={styles.therapistAddress}>Adres: {item.address || '-'}</Text>
        <Text style={styles.therapistSpecialty}>Uzmanlık: {item.specialty || 'Belirtilmemiş'}</Text>
        <Text style={styles.therapistEducation}>Eğitim: {item.educationBackground || '-'}</Text>
        <Text style={styles.therapistDetails}>Lisans: {item.licenseNumber || '-'} | Deneyim: {item.yearsOfExperience || '0'} yıl</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.approveButton]}
          onPress={() => handleApprove(item.id)} 
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Onayla</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.rejectButton]}
          onPress={() => handleReject(item.id)}
        >
          <Ionicons name="close-circle-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Reddet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Stack.Screen 
        options={{
          title: 'Bekleyen Terapistler',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }}
      />

      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loader} size="large" color="#6366F1" />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPendingTherapists}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : pendingTherapists.length === 0 ? (
        <View style={styles.emptyContainer}>
            <Ionicons name="person-remove-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Onay bekleyen terapist bulunmuyor.</Text>
        </View>
      ) : (
        <FlatList
          data={pendingTherapists}
          renderItem={renderTherapistItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
   emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
  },
  therapistCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  therapistInfo: {
    marginBottom: 10,
  },
  therapistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  therapistEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 4,
  },
  therapistPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  therapistAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  therapistSpecialty: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginTop: 5,
    marginBottom: 4,
  },
  therapistEducation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  therapistDetails: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
}); 