import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Keyboard,
  Platform,
  Dimensions
} from 'react-native';
import Modal from 'react-native-modal'; // Bu kütüphane web'de farklı çalışabilir, alternatif gerekebilir
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSearchTherapistByName } from '../../src/hooks/useApi'; // Hook yolunu kontrol et
import _debounce from 'lodash.debounce';

interface WebTherapistSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: number;
  name: string;
}

const isWeb = Platform.OS === 'web';
const screenWidth = Dimensions.get('window').width;
const isLargeScreen = screenWidth > 768;

// Component adı değiştirildi
export default function WebTherapistSearchModal({ visible, onClose }: WebTherapistSearchModalProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const {
    loading: searchLoading,
    error: searchError,
    request: searchTherapists
  } = useSearchTherapistByName();

  const debouncedSearchRef = useRef(
    _debounce((term: string) => {
      if (term.length >= 2) {
        console.log(`[WebModal] Arama API çağrısı yapılıyor: ${term}`);
        searchTherapists(term)
          .then(results => {
             console.log("[WebModal] Arama Sonuçları:", results);
             setSearchResults(results || []);
          })
          .catch(err => {
             console.error("[WebModal] Arama isteği hatası:", err);
             setSearchResults([]);
          });
      } else {
        setSearchResults([]);
      }
    }, 400)
  );

  useEffect(() => {
    const trimmedTerm = searchTerm.trim();
    debouncedSearchRef.current(trimmedTerm);
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, [searchTerm]);

  useEffect(() => {
    if (!visible) {
      setSearchTerm('');
      setSearchResults([]);
      debouncedSearchRef.current.cancel();
    }
  }, [visible]);

  const handleSelectTherapist = (therapist: SearchResult) => {
    console.log("[WebModal] Seçilen terapist (ID/Name):", therapist);
    if (therapist && therapist.id) {
       const params = {
         therapistId: therapist.id.toString(),
         therapistName: therapist.name,
       };
       console.log("[WebModal] Booking sayfasına yönlendiriliyor, params:", params);
       // Keyboard.dismiss(); // Web'de gerekmeyebilir
       onClose();
       router.push({ pathname: '/booking', params });
    } else {
       console.error("[WebModal] Seçilen terapistin ID'si bulunamadı:", therapist);
       Alert.alert("Hata", "Terapist bilgileri eksik.");
    }
  };

  const renderSearchResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.itemContainer} // Stiller daha sonra web için özelleştirilecek
      onPress={() => handleSelectTherapist(item)}
      activeOpacity={0.7}
    >
      <View style={styles.imagePlaceholder}>
         <Ionicons name="person-circle-outline" size={40} color="#ccc" />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.therapistName} numberOfLines={1}>{item.name}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#ccc" style={styles.chevronIcon}/>
    </TouchableOpacity>
  );

  const renderEmptyListComponent = () => {
    if (searchLoading || searchError) return null;

    const trimmedTerm = searchTerm.trim();
    if (trimmedTerm.length < 2) {
        return <Text style={styles.statusText}>Aramak için en az 2 karakter girin.</Text>;
    }
    if (trimmedTerm.length >= 2 && searchResults.length === 0) {
        return (
            <View style={styles.centeredStatusContent}>
              <Ionicons name="sad-outline" size={64} color="#ccc" />
              <Text style={styles.statusText}>'{searchTerm}' ile eşleşen terapist bulunamadı.</Text>
            </View>
        );
    }
    return null;
  };

  // Modal görünümü web için özelleştirilmeli
  // react-native-modal yerine web'e daha uygun bir kütüphane veya custom implementasyon gerekebilir.
  // Şimdilik basit bir View ile saralım ve görünürlüğe göre gösterelim.
  if (!visible) {
    return null;
  }

  return (
     <View style={styles.webModalBackdrop} /* onPress={onClose} - backdrop tıklaması eklenebilir */ >
         <View style={styles.webModalContainer}>
            <View style={styles.header}> 
              <Text style={styles.headerTitle}>Terapist Ara</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close-circle" size={30} color={'#666'} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={22} color="#aaa" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Terapist adı ara (en az 2 karakter)..."
                placeholderTextColor="#aaa"
                value={searchTerm}
                onChangeText={setSearchTerm}
                clearButtonMode="while-editing"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.listContainer}>
              {searchLoading ? (
                <View style={styles.centeredStatusContainer}>
                  <ActivityIndicator size="large" color="#6366F1" />
                </View>
              ) : searchError ? (
                 <View style={styles.centeredStatusContainer}>
                   <Ionicons name="cloud-offline-outline" size={64} color="#FF6B6B" />
                   <Text style={[styles.statusText, styles.errorText]}>Arama sırasında bir hata oluştu.</Text>
                 </View>
              ) : (
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchResultItem}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.listContentContainer}
                  ListEmptyComponent={renderEmptyListComponent}
                  // keyboardShouldPersistTaps="handled"
                />
              )}
            </View>
        </View>
     </View>
  );
}

// Stiller web için büyük ölçüde yeniden düzenlenmeli
const styles = StyleSheet.create({
    webModalBackdrop: {
        // position: 'fixed', // Yorumlandı - RN desteklemez
        position: 'absolute', // Alternatif
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000, 
    },
    webModalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        width: '60%',
        maxWidth: 600,
        // maxHeight: '80vh', // Yorumlandı - RN desteklemez, flex ile yönetilebilir
        maxHeight: '80%', // Alternatif
        overflow: 'hidden',
        // display: 'flex', // Yorumlandı - RN'de varsayılan
        flexDirection: 'column',
        paddingBottom: 15, 
        // boxShadow: '0 5px 15px rgba(0,0,0,0.2)', // Yorumlandı - elevation kullanılabilir
        elevation: 20, // Gölge için
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#f0f0f0', // Header arka planı
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        margin: 15,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: 45, // Biraz daha kısa
        fontSize: 16,
        color: '#333',
    },
    listContainer: {
        flex: 1, 
        // overflowY: 'auto', // Yorumlandı - FlatList kendi scroll'unu yönetir
    },
    listContentContainer: {
        flexGrow: 1,
        paddingHorizontal: 15,
        paddingBottom: 15, // FlatList sonu için boşluk
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#eee',
        // cursor: 'pointer', // Yorumlandı - RN'de doğrudan yok
    },
    imagePlaceholder: {
        width: 45, // Biraz daha küçük
        height: 45,
        borderRadius: 22.5,
        marginRight: 12,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    therapistName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
    },
    chevronIcon: {
        marginLeft: 10,
        opacity: 0.5,
    },
    centeredStatusContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        minHeight: 200, 
    },
    centeredStatusContent: {
        alignItems: 'center',
        marginTop: 15,
    },
    statusText: {
        marginTop: 15,
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
    },
    errorText: {
        color: '#DC2626',
    },
});
