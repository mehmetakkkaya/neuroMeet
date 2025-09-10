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
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSearchTherapistByName } from '../../src/hooks/useApi';
import _debounce from 'lodash.debounce';

interface TherapistSelectionModalProps {
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

export default function TherapistSelectionModal({ visible, onClose }: TherapistSelectionModalProps) {
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
        console.log(`Arama API çağrısı yapılıyor: ${term}`);
        searchTherapists(term)
          .then(results => {
             console.log("Arama Sonuçları:", results);
             setSearchResults(results || []);
          })
          .catch(err => {
             console.error("Arama isteği hatası (Modal):", err);
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
    console.log("Seçilen terapist (ID/Name):", therapist);
    if (therapist && therapist.id) {
       const params = {
         therapistId: therapist.id.toString(),
         therapistName: therapist.name,
       };
       console.log("Booking sayfasına yönlendiriliyor, params:", params);
       Keyboard.dismiss();
       onClose();
       router.push({ pathname: '/booking', params });
    } else {
       console.error("Seçilen terapistin ID'si bulunamadı:", therapist);
       Alert.alert("Hata", "Terapist bilgileri eksik.");
    }
  };

  const renderSearchResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.itemContainer}
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

  return (
    <Modal
      isVisible={visible}
      swipeDirection={isWeb ? undefined : 'down'}
      onSwipeComplete={isWeb ? undefined : onClose}
      onBackdropPress={onClose}
      hasBackdrop={!isWeb}
      animationIn={isWeb ? 'fadeIn' : 'slideInUp'}
      animationOut={isWeb ? 'fadeOut' : 'slideOutDown'}
      style={[styles.modal, isWeb && styles.modalWeb]}
      propagateSwipe
    >
      <View style={[styles.modalContentContainer, isWeb && styles.modalContentContainerWeb]}>
        <View style={[styles.header, isWeb && styles.headerWeb]}>
          <Text style={[styles.headerTitle, isWeb && styles.headerTitleWeb]}>Terapist Seçin</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-circle" size={30} color={isWeb ? '#666' : 'rgba(255, 255, 255, 0.8)'} />
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
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalWeb: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentContainer: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingTop: 10,
  },
  modalContentContainerWeb: {
    height: '80%',
    width: '60%',
    maxWidth: 600,
    maxHeight: 700,
    borderRadius: 15,
    paddingTop: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  headerWeb: {
    backgroundColor: '#6366F1',
    borderBottomColor: '#5556CE',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  headerTitleWeb: {
    color: 'white',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    flex: 1,
    marginTop: 5,
    ...(isWeb && { overflowY: 'auto' }),
  },
  listContentContainer: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 2px rgba(0,0,0,0.08)',
      }
    })
  },
  imagePlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 15,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  therapistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chevronIcon: {
    marginLeft: 10,
  },
  centeredStatusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredStatusContent: {
      alignItems: 'center',
      marginTop: 30,
  },
  statusText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B6B',
  },
});
