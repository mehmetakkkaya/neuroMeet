import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Image,
  Dimensions,
  ViewStyle,
  TextStyle,
  ImageStyle
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import useApi, { useGetProfile, useUpdateProfile } from '../../src/hooks/useApi';
import api from '../../src/services/api';
import { DocumentType, Document, TherapistUser, DocumentResponse, DocumentsListResponse, SuccessResponse, UpdateProfileRequest } from '../../src/types/api.types';

// Döküman yükleme için özel hook
const useUploadDocument = () => {
  return useApi<DocumentResponse, FormData>(api.users.uploadDocument);
};

// Dökümanları getirme için özel hook
const useGetDocuments = () => {
  return useApi<DocumentsListResponse, void>(() => api.users.getDocuments());
};

// Döküman silme için özel hook
const useDeleteDocument = () => {
  return useApi<SuccessResponse, string>(api.users.deleteDocument);
};

// Resim Yükleme Hook'u
const useUploadProfilePicture = () => {
  // api.uploadFile kullanacağız, ancak endpoint'i burada belirtelim
  return useApi< { profilePictureUrl: string }, FormData >(
    (formData) => api.uploadFile<{ profilePictureUrl: string }>('/users/profile/picture', formData)
  );
};

const { width } = Dimensions.get('window');

// Döküman tipi seçenekleri
const documentTypeOptions: { label: string; value: DocumentType }[] = [
  { label: 'Diploma', value: 'diploma' },
  { label: 'Sertifika', value: 'certificate' },
  { label: 'Lisans', value: 'license' },
  { label: 'Kimlik', value: 'identity' },
  { label: 'Diğer', value: 'other' }
];

// Stil tipleri için arayüz
interface EditProfileStyles {
  // Ortak & Mobil
  container: ViewStyle;
  loadingContainer: ViewStyle;
  keyboardView: ViewStyle;
  header: ViewStyle;
  headerContent: ViewStyle;
  backButton: ViewStyle;
  headerTitle: TextStyle;
  scrollView: ViewStyle;
  scrollContent: ViewStyle;
  profilePictureSection: ViewStyle;
  profileImageEdit: ImageStyle;
  changePictureButton: ViewStyle;
  formSection: ViewStyle;
  sectionTitle: TextStyle;
  sectionDescription: TextStyle;
  inputContainer: ViewStyle;
  label: TextStyle;
  input: ViewStyle | TextStyle; // TextInput style can be complex
  multilineInput: TextStyle;
  passwordInputContainer: ViewStyle;
  passwordInput: TextStyle;
  passwordVisibilityButton: ViewStyle;
  documentsList: ViewStyle;
  documentItem: ViewStyle;
  documentItemLeft: ViewStyle;
  documentIcon: ViewStyle;
  documentInfo: ViewStyle;
  documentName: TextStyle;
  documentType: TextStyle;
  documentDeleteButton: ViewStyle;
  noDocuments: ViewStyle;
  noDocumentsText: TextStyle;
  uploadFormContainer: ViewStyle;
  uploadFormTitle: TextStyle;
  documentTypeSelector: ViewStyle;
  documentTypeSelectorText: TextStyle;
  documentTypeOptions: ViewStyle;
  documentTypeOption: ViewStyle;
  documentTypeOptionText: TextStyle;
  documentTypeOptionTextSelected: TextStyle;
  documentFilePicker: ViewStyle;
  documentFilePickerButton: ViewStyle;
  documentFilePickerText: TextStyle;
  documentFileClearButton: ViewStyle;
  uploadButton: ViewStyle;
  uploadButtonDisabled: ViewStyle;
  uploadButtonText: TextStyle;
  saveButton: ViewStyle;
  saveButtonDisabled: ViewStyle;
  saveButtonText: TextStyle;
  // Web Specific
  webContainer: ViewStyle;
  webBackgroundGradient: ViewStyle;
  webScrollContent: ViewStyle;
  webMaxContentWidth: ViewStyle;
  webFormCard: ViewStyle;
  webSectionTitle: TextStyle;
  webProfilePictureSection: ViewStyle;
  webProfileImageEdit: ImageStyle;
  webChangePictureButton: ViewStyle;
  webInput: ViewStyle | TextStyle;
  webMultilineInput: TextStyle;
  webPasswordInputContainer: ViewStyle;
  webPasswordInput: TextStyle;
  webPasswordVisibilityButton: ViewStyle;
  webDocumentsList: ViewStyle;
  webDocumentItem: ViewStyle;
  webDocumentDeleteButton: ViewStyle;
  webUploadFormContainer: ViewStyle;
  webDocumentFilePicker: ViewStyle;
  webUploadButton: ViewStyle;
  webSaveButton: ViewStyle;
}

export default function EditProfileScreen() {
  // State yönetimi
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [educationBackground, setEducationBackground] = useState('');
  const [sessionFee, setSessionFee] = useState('');
  
  // Şifre değiştirme alanları
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Kullanıcı rolü
  const [userRole, setUserRole] = useState<'customer' | 'therapist' | 'admin' | null>(null);
  
  // Döküman yükleme için state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [documentFile, setDocumentFile] = useState<any>(null);
  const [showDocumentTypeOptions, setShowDocumentTypeOptions] = useState(false);
  
  // Yeni eklenen state
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // API hooks
  const getProfileHook = useGetProfile();
  const updateProfileHook = useUpdateProfile();
  const uploadDocumentHook = useUploadDocument();
  const getDocumentsHook = useGetDocuments();
  const deleteDocumentHook = useDeleteDocument();
  const uploadProfilePictureHook = useUploadProfilePicture();
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [sessionFeeError, setSessionFeeError] = useState('');
  
  // Profil bilgilerini yükleme
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Demo token ekleyelim (API çağrıları için)
        if (!api.getToken()) {
          api.setToken("demo-token-for-testing");
        }
        
        setIsLoading(true);
        const profileData = await getProfileHook.request();
        console.log("GET /profile yanıtı:", JSON.stringify(profileData, null, 2));
        
        if (profileData) {
          setName(profileData.name || '');
          setPhone(profileData.phone || '');
          setAddress(profileData.address || '');
          setProfilePicture(profileData.profilePicture || null);
          setUserRole(profileData.role);
          
          if (profileData.role === 'therapist') {
            const therapistData = profileData as TherapistUser;
            setSpecialty(therapistData.specialty || '');
            setBio(therapistData.bio || '');
            setEducationBackground(therapistData.educationBackground || '');
            setSessionFee(therapistData.sessionFee !== null && therapistData.sessionFee !== undefined ? String(therapistData.sessionFee) : '');
            
            // Dökümanları yükle
            loadDocuments();
          }
        }
      } catch (error) {
        console.error('Profil yüklenirken hata:', error);
        Alert.alert(
          'Hata',
          'Profil bilgileri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.'
        );
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, []);
  
  // Dökümanları yükleme
  const loadDocuments = async () => {
    try {
      const response = await getDocumentsHook.request();
      if (response) {
        setDocuments(response.documents);
      }
    } catch (error) {
      console.error('Dökümanlar yüklenirken hata:', error);
    }
  };
  
  // Döküman seçme
  const pickDocument = async () => {
    try {
      // İzinleri kontrol et
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Hatası', 'Döküman seçebilmek için izin vermeniz gerekiyor!');
          return;
        }
      }
      
      // Döküman seçme
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedFile = result.assets[0];
        
        // 5MB boyut kontrolü
        const fileSize = selectedFile.size;
        if (fileSize && fileSize > 5 * 1024 * 1024) { // 5MB
          Alert.alert('Hata', 'Dosya boyutu 5MB\'dan büyük olamaz');
          return;
        }
        
        setDocumentFile(selectedFile);
        if (!documentName) {
          setDocumentName(selectedFile.name || 'Belge');
        }
      }
    } catch (error) {
      console.error('Döküman seçme hatası:', error);
      Alert.alert('Hata', 'Döküman seçilirken bir hata oluştu');
    }
  };
  
  // Döküman yükleme
  const uploadDocument = async () => {
    if (!documentFile) {
      Alert.alert('Hata', 'Lütfen bir döküman seçin');
      return;
    }
    
    if (!documentName.trim()) {
      Alert.alert('Hata', 'Lütfen döküman için bir isim girin');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('name', documentName);
      formData.append('type', documentType);
      
      // Dosyayı ekle
      const fileUri = Platform.OS === 'ios' 
        ? documentFile.uri.replace('file://', '') 
        : documentFile.uri;
      
      formData.append('file', {
        uri: fileUri,
        name: documentFile.name,
        type: documentFile.mimeType
      } as any);
      
      // Döküman yükle
      await uploadDocumentHook.request(formData);
      
      // Formu temizle
      setDocumentName('');
      setDocumentType('other');
      setDocumentFile(null);
      
      // Dökümanları yeniden yükle
      await loadDocuments();
      
      Alert.alert('Başarılı', 'Döküman başarıyla yüklendi');
    } catch (error) {
      console.error('Döküman yükleme hatası:', error);
      Alert.alert('Hata', 'Döküman yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Döküman silme
  const confirmDeleteDocument = (documentId: string) => {
    Alert.alert(
      'Döküman Silme',
      'Bu dökümanı silmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => deleteDocument(documentId)
        }
      ]
    );
  };
  
  const deleteDocument = async (documentId: string) => {
    try {
      setIsLoading(true);
      await deleteDocumentHook.request(documentId);
      
      // Dökümanları güncelle
      setDocuments(documents.filter(doc => doc._id !== documentId));
      
      Alert.alert('Başarılı', 'Döküman başarıyla silindi');
    } catch (error) {
      console.error('Döküman silme hatası:', error);
      Alert.alert('Hata', 'Döküman silinirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Profil güncelleme (Resim yüklemeyi de içerecek şekilde güncellendi)
  const handleUpdateProfile = async () => {
    // Şifre kontrolleri
      if (password || confirmPassword) {
        if (password !== confirmPassword) {
          Alert.alert('Hata', 'Şifreler eşleşmiyor');
          return;
        }
        if (password.length < 6) {
          Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
          return;
        }
      }
      
    setIsLoading(true); // Genel yükleme state'i
    let uploadedProfilePictureUrl: string | null = null;

    // 1. Adım: Yeni resim seçilmişse yükle
    if (selectedImage) {
      setIsUploading(true); // Resim yükleme başladı
      try {
        const formData = new FormData();
        const fileUri = Platform.OS === 'ios' 
          ? selectedImage.uri.replace('file://', '') 
          : selectedImage.uri;
        
        // Dosya adını ve türünü al (ImagePicker'dan)
        const filename = selectedImage.uri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        
        formData.append('profilePicture', { // Backend'deki middleware'in beklediği alan adı
          uri: fileUri,
          name: filename,
          type: type,
        } as any);

        console.log("Profil resmi yükleniyor...");
        const uploadResponse = await uploadProfilePictureHook.request(formData);
        
        if (uploadResponse && uploadResponse.profilePictureUrl) {
          uploadedProfilePictureUrl = uploadResponse.profilePictureUrl;
          console.log("Resim yüklendi, URL:", uploadedProfilePictureUrl);
        } else {
          throw new Error("Resim yüklendi ancak URL alınamadı.");
        }
      } catch (uploadError) {
        console.error('Profil resmi yükleme hatası:', uploadError);
        Alert.alert('Hata', 'Profil resmi yüklenirken bir hata oluştu.');
        setIsUploading(false);
        setIsLoading(false);
        return; // Yükleme başarısızsa devam etme
      } finally {
        setIsUploading(false); // Resim yükleme bitti
      }
    } // End of image upload block

    // 2. Adım: Profil bilgilerini güncelle (yeni URL ile veya eskisini koruyarak)
    try {
      const profileData: UpdateProfileRequest = {
        name,
        phone,
        address,
        // Yeni resim yüklendiyse onu kullan, yoksa null gönder (backend eskisiyle değiştirmez)
        // ÖNEMLİ: Backend updateUserProfile, null gelirse mevcut resmi silmemeli!
        profilePicture: uploadedProfilePictureUrl, 
      };
      
      // Terapist ise profesyonel bilgileri ekle
      if (userRole === 'therapist') {
        profileData.specialty = specialty;
        profileData.bio = bio;
        profileData.educationBackground = educationBackground;
        profileData.sessionFee = sessionFee.trim() ? parseFloat(sessionFee) : null;
      }
      
      // Şifre değişikliği varsa ekle
      if (password) {
        profileData.password = password;
      }
      
      console.log("Profil güncelleniyor, data:", profileData);
      await updateProfileHook.request(profileData);
      
      console.log("Profil başarıyla güncellendi, profil sayfasına yönlendiriliyor...");
      router.replace('/(tabs)/profile'); // Veya profil sayfasının doğru yolu
      
    } catch (updateError) {
      console.error('Profil güncelleme hatası:', updateError);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setIsLoading(false); // Genel yükleme bitti
    }
  };
  
  // Resim Seçme Fonksiyonu
  const pickImage = async () => {
    // İzinleri iste (Galeri)
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Profil resmi seçebilmek için galeri izni vermeniz gerekiyor.');
      return;
    }

    // Galeriyi aç
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Kullanıcıya kırpma/düzenleme izni ver
      aspect: [1, 1], // Kare oranını zorla (isteğe bağlı)
      quality: 0.7, // Kaliteyi biraz düşürerek dosya boyutunu azalt
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      console.log("Seçilen Resim:", result.assets[0]);
      setSelectedImage(result.assets[0]); // Seçilen resmi state'e ata
      setProfilePicture(result.assets[0].uri); // Önizlemeyi güncelle
    }
  };
  
  // Mobil Header
  const renderMobileHeader = () => (
    <LinearGradient
      colors={['#9D6FF0', '#6366F1']}
      style={styles.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Düzenle</Text>
        <View style={{width: 24}} />
      </View>
    </LinearGradient>
  );

  // Ortak Profil Resmi Alanı (Web/Mobil)
  const renderProfilePictureSection = () => (
    <View style={[styles.profilePictureSection, Platform.OS === 'web' && styles.webProfilePictureSection]}>
      <Image
        source={{ uri: profilePicture || 'https://via.placeholder.com/150/cccccc/888888?text=Profil' }}
        style={[styles.profileImageEdit, Platform.OS === 'web' && styles.webProfileImageEdit]}
      />
      <TouchableOpacity 
        style={[styles.changePictureButton, Platform.OS === 'web' && styles.webChangePictureButton]} 
        onPress={pickImage}
      >
        <Ionicons name="camera-reverse-outline" size={Platform.OS === 'web' ? 20 : 18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Ortak Form Alanları (Web/Mobil - Stil farkları ile)
  const renderFormSections = () => (
    <>
      {/* Kişisel Bilgiler */}
      <View style={[styles.formSection, Platform.OS === 'web' && styles.webFormCard]}>
        <Text style={[styles.sectionTitle, Platform.OS === 'web' && styles.webSectionTitle]}>Kişisel Bilgiler</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>İsim</Text>
          <TextInput
            style={[styles.input, Platform.OS === 'web' && styles.webInput] as any}
            value={name}
            onChangeText={setName}
            placeholder="Adınız ve soyadınız"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={[styles.input, Platform.OS === 'web' && styles.webInput] as any}
            value={phone}
            onChangeText={setPhone}
            placeholder="Telefon numaranız"
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Adres</Text>
          <TextInput
            style={[styles.input, styles.multilineInput, Platform.OS === 'web' && styles.webInput, Platform.OS === 'web' && styles.webMultilineInput] as any}
            value={address}
            onChangeText={setAddress}
            placeholder="Adres bilgileriniz"
            multiline
            numberOfLines={Platform.OS === 'web' ? 4 : 3}
          />
        </View>
      </View>

      {/* Şifre Değiştirme */}
      <View style={[styles.formSection, Platform.OS === 'web' && styles.webFormCard]}>
        <Text style={[styles.sectionTitle, Platform.OS === 'web' && styles.webSectionTitle]}>Şifre Değiştir</Text>
        <Text style={styles.sectionDescription}>
          Şifrenizi değiştirmek istiyorsanız, aşağıdaki alanları doldurun. Değiştirmek istemiyorsanız boş bırakın.
        </Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yeni Şifre</Text>
          <View style={[styles.passwordInputContainer, Platform.OS === 'web' && styles.webPasswordInputContainer]}>
            <TextInput
              style={[styles.input, styles.passwordInput, Platform.OS === 'web' && styles.webInput, Platform.OS === 'web' && styles.webPasswordInput] as any}
              value={password}
              onChangeText={setPassword}
              placeholder="Yeni şifreniz (en az 6 karakter)"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={[styles.passwordVisibilityButton, Platform.OS === 'web' && styles.webPasswordVisibilityButton]}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#9D6FF0"
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yeni Şifre (Tekrar)</Text>
          <TextInput
            style={[styles.input, Platform.OS === 'web' && styles.webInput] as any}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Yeni şifrenizi tekrar girin"
            secureTextEntry={!showPassword}
          />
        </View>
      </View>

      {/* Terapist Özel Bilgileri */} 
      {userRole === 'therapist' && (
        <>
          <View style={[styles.formSection, Platform.OS === 'web' && styles.webFormCard]}>
            <Text style={[styles.sectionTitle, Platform.OS === 'web' && styles.webSectionTitle]}>Profesyonel Bilgiler</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Uzmanlık Alanı</Text>
              <TextInput
                style={[styles.input, Platform.OS === 'web' && styles.webInput] as any}
                value={specialty}
                onChangeText={setSpecialty}
                placeholder="Uzmanlık alanınız"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Eğitim</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, Platform.OS === 'web' && styles.webInput, Platform.OS === 'web' && styles.webMultilineInput] as any}
                value={educationBackground}
                onChangeText={setEducationBackground}
                placeholder="Eğitim bilgileriniz"
                multiline
                numberOfLines={Platform.OS === 'web' ? 4 : 3}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Biyografi</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, Platform.OS === 'web' && styles.webInput, Platform.OS === 'web' && styles.webMultilineInput] as any}
                value={bio}
                onChangeText={setBio}
                placeholder="Kendinizi tanıtın"
                multiline
                numberOfLines={Platform.OS === 'web' ? 6 : 5}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Seans Ücreti (TL)</Text>
              <TextInput
                style={[
                  styles.input, 
                  Platform.OS === 'web' && styles.webInput,
                  sessionFeeError ? { borderColor: '#FF6B6B' } : null // Hata stili
                ] as any}
                value={sessionFee}
                onChangeText={handleSessionFeeChange}
                placeholder="Seans başına ücret (Örn: 500)"
                keyboardType="decimal-pad"
              />
              {sessionFeeError ? <Text style={{ color: '#FF6B6B', fontSize: 12, marginTop: 4 }}>{sessionFeeError}</Text> : null}
            </View>
          </View>

          {/* Döküman Yükleme Bölümü */} 
          <View style={[styles.formSection, Platform.OS === 'web' && styles.webFormCard]}>
            <Text style={[styles.sectionTitle, Platform.OS === 'web' && styles.webSectionTitle]}>Dökümanlar</Text>
            <Text style={styles.sectionDescription}>
              Diploma, sertifika ve lisans belgelerinizi yükleyebilirsiniz.
            </Text>
            
            {/* Yüklü Dökümanlar */} 
            {documents.length > 0 ? (
              <View style={[styles.documentsList, Platform.OS === 'web' && styles.webDocumentsList]}>
                {documents.map((doc) => (
                  <View key={doc._id} style={[styles.documentItem, Platform.OS === 'web' && styles.webDocumentItem]}>
                    <View style={styles.documentItemLeft}>
                      <View style={styles.documentIcon}>
                        <MaterialIcons name="description" size={20} color="#9D6FF0" />
                      </View>
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentName} numberOfLines={1}>{doc.name}</Text>
                        <Text style={styles.documentType}>
                          {documentTypeOptions.find(item => item.value === doc.type)?.label || doc.type}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.documentDeleteButton, Platform.OS === 'web' && styles.webDocumentDeleteButton]}
                      onPress={() => confirmDeleteDocument(doc._id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noDocuments}>
                <MaterialIcons name="upload-file" size={48} color="#DDD" />
                <Text style={styles.noDocumentsText}>Henüz döküman yüklenmemiş</Text>
              </View>
            )}

            {/* Yeni Döküman Yükleme Formu */} 
            <View style={[styles.uploadFormContainer, Platform.OS === 'web' && styles.webUploadFormContainer]}>
              <Text style={styles.uploadFormTitle}>Yeni Döküman Yükle</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Döküman Adı</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && styles.webInput] as any}
                  value={documentName}
                  onChangeText={setDocumentName}
                  placeholder="Döküman adı girin"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Döküman Tipi</Text>
                <TouchableOpacity
                  style={styles.documentTypeSelector} // Web için stil gerekebilir
                  onPress={() => setShowDocumentTypeOptions(!showDocumentTypeOptions)}
                >
                  <Text style={styles.documentTypeSelectorText}>
                    {documentTypeOptions.find(item => item.value === documentType)?.label || 'Seçiniz'}
                  </Text>
                  <Ionicons
                    name={showDocumentTypeOptions ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
                {showDocumentTypeOptions && (
                  <View style={styles.documentTypeOptions}> 
                    {documentTypeOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={styles.documentTypeOption}
                        onPress={() => {
                          setDocumentType(option.value);
                          setShowDocumentTypeOptions(false);
                        }}
                      >
                        <Text style={[
                          styles.documentTypeOptionText,
                          documentType === option.value && styles.documentTypeOptionTextSelected
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={[styles.documentFilePicker, Platform.OS === 'web' && styles.webDocumentFilePicker]}>
                <TouchableOpacity
                  style={styles.documentFilePickerButton}
                  onPress={pickDocument}
                >
                  <Ionicons name="attach" size={20} color="#9D6FF0" />
                  <Text style={styles.documentFilePickerText} numberOfLines={1}>
                    {documentFile ? documentFile.name : 'Döküman Seç'}
                  </Text>
                </TouchableOpacity>
                {documentFile && (
                  <TouchableOpacity
                    style={styles.documentFileClearButton}
                    onPress={() => setDocumentFile(null)}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  Platform.OS === 'web' && styles.webUploadButton,
                  (!documentFile || !documentName) && styles.uploadButtonDisabled
                ]}
                onPress={uploadDocument}
                disabled={!documentFile || !documentName}
              >
                <Text style={styles.uploadButtonText}>Döküman Yükle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </>
  );

  // Ortak Kaydet Butonu (Web/Mobil)
  const renderSaveButton = () => (
     <TouchableOpacity
       style={[
         styles.saveButton,
         Platform.OS === 'web' && styles.webSaveButton,
         (isLoading || isUploading) && styles.saveButtonDisabled
       ]}
       onPress={handleUpdateProfile}
       disabled={isLoading || isUploading}
     >
       {(isLoading || isUploading) ?
         <ActivityIndicator color="#fff"/> :
         <Text style={styles.saveButtonText}>Profili Güncelle</Text>
       }
     </TouchableOpacity>
   );

  // Mobil Layout
  const renderMobileLayout = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {renderMobileHeader()} 
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderProfilePictureSection()} 
          {renderFormSections()} 
          {renderSaveButton()} 
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Web Layout
  const renderWebLayout = () => (
    <LinearGradient
      colors={['#A78BFA', '#D8B4FE', '#F5F3FF']} // Gradient arka plan
      style={styles.webBackgroundGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.webContainer}>
        <Stack.Screen options={{ title: 'Profil Düzenle', headerBackVisible: true, headerTitleAlign: 'center', headerStyle: { backgroundColor: 'transparent'}, headerShadowVisible: false }} />
        <ScrollView contentContainerStyle={styles.webScrollContent}>
          <View style={styles.webMaxContentWidth}>
            {renderProfilePictureSection()} 
            {renderFormSections()} 
            {renderSaveButton()} 
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );

  // Session Fee Değişiklik Handler (signup.tsx'deki gibi)
  const handleSessionFeeChange = (text: string) => {
    const numericValue = text.replace(/[^0-9.]/g, ''); 
    const parts = numericValue.split('.');
    let finalValue = numericValue;
    if (parts.length > 2) {
      finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    setSessionFee(finalValue);
    if (finalValue.trim() === '') {
       setSessionFeeError(''); 
    } else if (isNaN(parseFloat(finalValue))) {
        setSessionFeeError('Lütfen geçerli bir sayı girin');
    } else if (parseFloat(finalValue) < 0) {
        setSessionFeeError('Seans ücreti negatif olamaz');
    } else {
        setSessionFeeError('');
    }
};

  // --- Ana Render ---
  return Platform.select({
    web: renderWebLayout(),
    default: renderMobileLayout(),
  });
}

const styles = StyleSheet.create<EditProfileStyles>({
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
  keyboardView: {
    flex: 1,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E5EA',
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  documentsList: {
    marginBottom: 20,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  documentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(157, 111, 240, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
    marginRight: 8,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  documentType: {
    fontSize: 13,
    color: '#888',
  },
  documentDeleteButton: {
    padding: 5,
    marginLeft: 10,
  },
  noDocuments: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    marginBottom: 20,
  },
  noDocumentsText: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
  },
  uploadFormContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  uploadFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  documentTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E5EA',
  },
  documentTypeSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  documentTypeOptions: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E5EA',
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  documentTypeOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  documentTypeOptionText: {
    fontSize: 16,
    color: '#333',
  },
  documentTypeOptionTextSelected: {
    fontWeight: '600',
    color: '#9D6FF0',
  },
  documentFilePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  documentFilePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E5EA',
    flex: 1,
  },
  documentFilePickerText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  documentFileClearButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#9D6FF0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#D1D1D1',
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  passwordVisibilityButton: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  profileImageEdit: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#eee',
  },
  changePictureButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  changePictureButtonText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
  },
  webContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webBackgroundGradient: {
    flex: 1,
  },
  webScrollContent: {
    paddingVertical: 50,
    paddingHorizontal: '5%',
    alignItems: 'center',
    flexGrow: 1,
  },
  webMaxContentWidth: {
    width: '100%',
    maxWidth: 900,
    flex: 1,
    justifyContent: 'flex-start',
    flexDirection: 'column',
  },
  webFormCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  webSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 25,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webProfilePictureSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  webProfileImageEdit: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: '#E5E7EB',
  },
  webChangePictureButton: {
    position: 'absolute',
    bottom: 10,
    right: 380,
    backgroundColor: '#6366F1',
    padding: 8,
    borderRadius: 20,
  },
  webInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 15,
  },
  webMultilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  webPasswordInputContainer: {
  },
  webPasswordInput: {
    paddingRight: 45,
  },
  webPasswordVisibilityButton: {
    right: 5,
  },
  webDocumentsList: {
  },
  webDocumentItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 10,
  },
  webDocumentDeleteButton: {
  },
  webUploadFormContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  webDocumentFilePicker: {
  },
  webUploadButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
  },
  webSaveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    marginTop: 30,
    alignSelf: 'center',
    width: '60%',
    maxWidth: 350,
  },
}); 