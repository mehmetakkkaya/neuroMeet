import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  LayoutAnimation,
  UIManager,
  Alert,
  Image,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRegisterCustomer, useRegisterTherapist } from '../../src/hooks/useApi';
import { RegisterCustomerRequest, RegisterTherapistRequest, Gender } from '../../src/types/api.types';

// Layout Animation için Android desteği
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type UserRole = 'customer' | 'therapist';

// Common user data
interface CommonUserData {
  name: string;
  email: string;
  password: string;
  phone: string;
  dateOfBirth: Date;
  gender: string;
  address: string;
}

// Therapist specific data
interface TherapistData extends CommonUserData {
  specialty: string;
  licenseNumber: string;
  educationBackground: string;
  yearsOfExperience: number;
  bio: string;
}

// Validation patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

// Get screen dimensions
const { width, height } = Dimensions.get('window');

export default function SignupScreen() {
  const params = useLocalSearchParams();
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(0)).current;
  
  // transform ile paddingTop yerine translateY kullanacağız
  const formOffsetY = useRef(new Animated.Value(0)).current;
  
  // Font boyutu yerine scale kullanacağız
  const titleScale = useRef(new Animated.Value(1)).current;
  const roleLabelScale = useRef(new Animated.Value(1)).current;
  
  // Animasyon konfigürasyonu
  const configureNextAnimation = () => {
    LayoutAnimation.configureNext({
      duration: 350,
      create: { 
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: { 
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  };
  
  // Common user data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  
  // Therapist specific data
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [educationBackground, setEducationBackground] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [bio, setBio] = useState('');
  const [sessionFee, setSessionFee] = useState('');

  // Form validation errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [genderError, setGenderError] = useState('');
  const [addressError, setAddressError] = useState('');
  
  // Therapist specific errors
  const [specialtyError, setSpecialtyError] = useState('');
  const [licenseNumberError, setLicenseNumberError] = useState('');
  const [educationError, setEducationError] = useState('');
  const [experienceError, setExperienceError] = useState('');
  const [sessionFeeError, setSessionFeeError] = useState('');
  
  // Form validity
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Check form validity on data change
  useEffect(() => {
    validateForm();
  }, [
    name, email, password, phone, gender, address, 
    selectedRole, specialty, licenseNumber, educationBackground, yearsOfExperience, sessionFee
  ]);

  // Klavye eventlerini dinle
  useEffect(() => {
    const keyboardWillShowListener = Platform.OS === 'ios' 
      ? Keyboard.addListener('keyboardWillShow', keyboardWillShow)
      : Keyboard.addListener('keyboardDidShow', keyboardDidShow);
      
    const keyboardWillHideListener = Platform.OS === 'ios'
      ? Keyboard.addListener('keyboardWillHide', keyboardWillHide)
      : Keyboard.addListener('keyboardDidHide', keyboardDidHide);

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);
  
  // Klavye gösterildiğinde animasyon
  const keyboardWillShow = () => {
    // LayoutAnimation ile akıcı geçiş
    configureNextAnimation();
    
    // Animasyonlu geçişler - transform ile useNativeDriver: true kullanıyoruz
    Animated.parallel([
      Animated.timing(formOffsetY, {
        toValue: -height * 0.03, // Yukarı kaydırmak için negatif değer
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(titleScale, {
        toValue: 0.75, // %75 ölçek (daha küçük)
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(roleLabelScale, {
        toValue: 0.8, // %80 ölçek
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
    
    setKeyboardVisible(true);
  };
  
  // Klavye gösterildiğinde animasyon (Android için)
  const keyboardDidShow = () => {
    keyboardWillShow();
  };
  
  // Klavye gizlendiğinde animasyon
  const keyboardWillHide = () => {
    // LayoutAnimation ile akıcı geçiş
    configureNextAnimation();
    
    // Animasyonlu geçişler - transform ile useNativeDriver: true kullanıyoruz
    Animated.parallel([
      Animated.timing(formOffsetY, {
        toValue: 0, // Normal konuma geri dön
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(titleScale, {
        toValue: 1, // Normal boyuta geri dön
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(roleLabelScale, {
        toValue: 1, // Normal boyuta geri dön
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
    
    setKeyboardVisible(false);
  };
  
  // Klavye gizlendiğinde animasyon (Android için)
  const keyboardDidHide = () => {
    keyboardWillHide();
  };
  
  // Set initial role from navigation params
  useEffect(() => {
    if (params.role && (params.role === 'customer' || params.role === 'therapist')) {
      setSelectedRole(params.role as UserRole);
    }
  }, [params.role]);
  
  const formatDate = (date: Date) => {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleBackToRoleSelect = () => {
    router.push('/auth/role-select');
  };
  
  // Input validation handlers
  const handleNameChange = (text: string) => {
    setName(text);
    if (!text.trim()) {
      setNameError('Name is required');
    } else if (text.length < 2) {
      setNameError('Name must be at least 2 characters');
    } else {
      setNameError('');
    }
  };
  
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (!text.trim()) {
      setEmailError('Email is required');
    } else if (!EMAIL_REGEX.test(text)) {
      setEmailError('Please enter a valid email');
    } else {
      setEmailError('');
    }
  };
  
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (!text.trim()) {
      setPasswordError('Password is required');
    } else if (text.length < 6) {
      setPasswordError('Password must be at least 6 characters');
    } else {
      setPasswordError('');
    }
  };
  
  const handlePhoneChange = (text: string) => {
    setPhone(text);
    if (!text.trim()) {
      setPhoneError('Phone number is required');
    } else if (!PHONE_REGEX.test(text.replace(/[^0-9]/g, ''))) {
      setPhoneError('Please enter a valid 10-digit phone number');
    } else {
      setPhoneError('');
    }
  };
  
  const handleGenderSelect = (selectedGender: string) => {
    setGender(selectedGender as Gender);
    setGenderError('');
  };
  
  const handleAddressChange = (text: string) => {
    setAddress(text);
    if (!text.trim()) {
      setAddressError('Address is required');
    } else if (text.length < 5) {
      setAddressError('Please enter a complete address');
    } else {
      setAddressError('');
    }
  };
  
  // Therapist specific handlers
  const handleSpecialtyChange = (text: string) => {
    setSpecialty(text);
    if (selectedRole === 'therapist' && !text.trim()) {
      setSpecialtyError('Specialty is required');
    } else {
      setSpecialtyError('');
    }
  };
  
  const handleLicenseChange = (text: string) => {
    setLicenseNumber(text);
    if (selectedRole === 'therapist' && !text.trim()) {
      setLicenseNumberError('License number is required');
    } else {
      setLicenseNumberError('');
    }
  };
  
  const handleEducationChange = (text: string) => {
    setEducationBackground(text);
    if (selectedRole === 'therapist' && !text.trim()) {
      setEducationError('Education background is required');
    } else {
      setEducationError('');
    }
  };
  
  const handleExperienceChange = (text: string) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setYearsOfExperience(numericValue);
    
    if (selectedRole === 'therapist' && !numericValue.trim()) {
      setExperienceError('Years of experience is required');
    } else {
      setExperienceError('');
    }
  };
  
  const handleSessionFeeChange = (text: string) => {
    // Sadece sayılara ve tek bir ondalık ayırıcıya (nokta) izin ver
    const numericValue = text.replace(/[^0-9.]/g, ''); 
    // Birden fazla nokta olmasını engelle
    const parts = numericValue.split('.');
    let finalValue = numericValue;
    if (parts.length > 2) {
      finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    setSessionFee(finalValue);
    if (selectedRole === 'therapist') {
      if (finalValue.trim() === '') {
         // Opsiyonel olduğu için hata gösterme
         setSessionFeeError(''); 
      } else if (isNaN(parseFloat(finalValue))) {
          setSessionFeeError('Lütfen geçerli bir sayı girin');
      } else if (parseFloat(finalValue) < 0) {
          setSessionFeeError('Seans ücreti negatif olamaz');
      } else {
          setSessionFeeError('');
      }
    } else {
        setSessionFeeError(''); // Terapist değilse hata olmamalı
    }
  };
  
  // Validate the complete form
  const validateForm = () => {
    // Common validations
    const isNameValid = name.trim() !== '' && name.length >= 2;
    const isEmailValid = email.trim() !== '' && EMAIL_REGEX.test(email);
    const isPasswordValid = password.trim() !== '' && password.length >= 6;
    const isPhoneValid = phone.trim() !== '' && PHONE_REGEX.test(phone.replace(/[^0-9]/g, ''));
    const isGenderValid = gender !== '';
    const isAddressValid = address.trim() !== '' && address.length >= 5;
    
    let isValid = isNameValid && isEmailValid && isPasswordValid && isPhoneValid && isGenderValid && isAddressValid;
    
    // Therapist specific validations
    if (selectedRole === 'therapist') {
      const isSpecialtyValid = specialty.trim() !== '';
      const isLicenseValid = licenseNumber.trim() !== '';
      const isEducationValid = educationBackground.trim() !== '';
      const isExperienceValid = yearsOfExperience.trim() !== '';
      const isSessionFeeValid = sessionFee.trim() === '' || (!isNaN(parseFloat(sessionFee)) && parseFloat(sessionFee) >= 0);
      
      isValid = isValid && isSpecialtyValid && isLicenseValid && isEducationValid && isExperienceValid && isSessionFeeValid;
    }
    
    setIsFormValid(isValid);
    return isValid;
  };

  // API hook'ları
  const registerCustomerHook = useRegisterCustomer();
  const registerTherapistHook = useRegisterTherapist();

  const handleSignup = () => {
    // Validate form completion
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    // Common data
    const userData: RegisterCustomerRequest = {
      name,
      email,
      password,
      phone,
      dateOfBirth: dateOfBirth.toISOString().split('T')[0], // YYYY-MM-DD formatı
      gender: gender as Gender,
      address
    };

    if (selectedRole === 'customer') {
      // Müşteri kaydı
      registerCustomerHook.request(userData)
        .then(response => {
          console.log('Müşteri kaydı başarılı:', response);
          // Başarılı kayıt sonrası ana sayfaya yönlendirme
          router.replace('/(tabs)');
        })
        .catch(error => {
          console.error('Kayıt hatası:', error);
          Alert.alert(
            'Kayıt Hatası',
            'Kayıt işlemi sırasında bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyiniz.',
            [{ text: 'Tamam' }]
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Terapist data
      const therapistData: RegisterTherapistRequest = {
        ...userData,
        specialty,
        licenseNumber,
        educationBackground,
        yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
        bio,
        sessionFee: sessionFee.trim() ? parseFloat(sessionFee) : undefined 
      };
      
      registerTherapistHook.request(therapistData)
        .then(response => {
          console.log('Terapist kaydı başarılı:', response);
          // BAŞARILI TERAPİST KAYDI SONRASI YÖNLENDİRME
          // Kullanıcıyı onay bekleme ekranına yönlendir
          router.replace('/auth/pending-approval'); 
        })
        .catch(error => {
          console.error('Kayıt hatası:', error);
          Alert.alert(
            'Kayıt Hatası',
            'Kayıt işlemi sırasında bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyiniz.',
            [{ text: 'Tamam' }]
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  // Gender selection component
  const GenderSelector = () => (
    <View style={[styles.genderContainer, Platform.OS === 'web' && styles.webGenderContainer]}>
      <TouchableOpacity 
        style={[styles.genderButton, gender === 'male' && styles.selectedGender]}
        onPress={() => handleGenderSelect('male')}
      >
        <Text style={[styles.genderText, gender === 'male' && styles.selectedGenderText]}>Erkek</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.genderButton, gender === 'female' && styles.selectedGender]}
        onPress={() => handleGenderSelect('female')}
      >
        <Text style={[styles.genderText, gender === 'female' && styles.selectedGenderText]}>Kadın</Text>
      </TouchableOpacity>
    </View>
  );

  // ---- Mobil Görünüm ----
  const renderMobileLayout = () => (
    <>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#E2D1F9', '#FFFFFF']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <KeyboardAwareScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={Platform.OS === 'ios' ? 30 : 60}
            extraHeight={120}
            resetScrollToCoords={{ x: 0, y: 0 }}
            scrollEnabled={true}
            bounces={true}
            keyboardOpeningTime={0}
            onKeyboardDidShow={() => {
              console.log('Keyboard shown');
            }}
            onKeyboardDidHide={() => {
              console.log('Keyboard hidden');
            }}
            keyboardDismissMode="none"
            enableResetScrollToCoords={false}
            overScrollMode="never"
          >
            <Animated.View style={[
              styles.formContainer,
              { transform: [{ translateY: formOffsetY }] }
            ]}>
              <TouchableOpacity style={styles.backButton} onPress={handleBackToRoleSelect}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Animated.Text style={[styles.title, { transform: [{ scale: titleScale }] }]}>Hesap Oluştur</Animated.Text>
              <Animated.Text style={[styles.roleLabel, { transform: [{ scale: roleLabelScale }] }]}>
                {selectedRole === 'customer' ? 'Müşteri olarak' : 'Terapist olarak'}
              </Animated.Text>
              {!keyboardVisible && (
                <Animated.View style={[styles.infoTextContainer, { opacity: fadeAnim }]}>
                  <Text style={styles.infoText}>Zaten hesabın var mı? </Text>
                  <Link href="/auth/login" asChild>
                    <TouchableOpacity>
                      <Text style={styles.loginLink}>Giriş Yap</Text>
                    </TouchableOpacity>
                  </Link>
                </Animated.View>
              )}
              <View style={styles.inputContainer}>
                <TextInput style={[styles.input, nameError ? styles.inputError : null]} placeholder="Ad Soyad" value={name} onChangeText={handleNameChange} placeholderTextColor="#999"/>
                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                <TextInput style={[styles.input, emailError ? styles.inputError : null]} placeholder="E-posta" value={email} onChangeText={handleEmailChange} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999"/>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                <View style={[styles.passwordContainer, passwordError ? styles.inputError : null]}>
                  <TextInput style={styles.passwordInput} placeholder="Şifre" secureTextEntry={!showPassword} value={password} onChangeText={handlePasswordChange} placeholderTextColor="#999"/>
                  <TouchableOpacity style={styles.passwordVisibilityBtn} onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" /></TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                <TextInput style={[styles.input, phoneError ? styles.inputError : null]} placeholder="Telefon (5xxxxxxxxx)" value={phone} onChangeText={handlePhoneChange} keyboardType="phone-pad" placeholderTextColor="#999"/>
                {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}><Text style={dateOfBirth !== new Date() ? styles.inputText : styles.inputPlaceholder}>{dateOfBirth !== new Date() ? formatDate(dateOfBirth) : "Doğum Tarihi"}</Text></TouchableOpacity>
                {showDatePicker && <DateTimePicker value={dateOfBirth} mode="date" display="default" onChange={handleDateChange}/>}
                <Text style={styles.labelText}>Cinsiyet</Text>
                <GenderSelector />
                {genderError ? <Text style={styles.errorText}>{genderError}</Text> : null}
                <TextInput style={[styles.input, styles.addressInput, addressError ? styles.inputError : null]} placeholder="Adres" value={address} onChangeText={handleAddressChange} multiline numberOfLines={3} placeholderTextColor="#999"/>
                {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}
                {selectedRole === 'therapist' && (
                  <>
                    <TextInput style={[styles.input, specialtyError ? styles.inputError : null]} placeholder="Uzmanlık Alanı" value={specialty} onChangeText={handleSpecialtyChange} placeholderTextColor="#999"/>
                    {specialtyError ? <Text style={styles.errorText}>{specialtyError}</Text> : null}
                    <TextInput style={[styles.input, licenseNumberError ? styles.inputError : null]} placeholder="Lisans Numarası" value={licenseNumber} onChangeText={handleLicenseChange} placeholderTextColor="#999"/>
                    {licenseNumberError ? <Text style={styles.errorText}>{licenseNumberError}</Text> : null}
                    <TextInput style={[styles.input, educationError ? styles.inputError : null]} placeholder="Eğitim Geçmişi" value={educationBackground} onChangeText={handleEducationChange} placeholderTextColor="#999"/>
                    {educationError ? <Text style={styles.errorText}>{educationError}</Text> : null}
                    <TextInput style={[styles.input, experienceError ? styles.inputError : null]} placeholder="Deneyim Yılı" value={yearsOfExperience} onChangeText={handleExperienceChange} keyboardType="numeric" placeholderTextColor="#999"/>
                    {experienceError ? <Text style={styles.errorText}>{experienceError}</Text> : null}
                    <TextInput style={[styles.input, sessionFeeError ? styles.inputError : null]} placeholder="Seans Ücreti (Opsiyonel)" value={sessionFee} onChangeText={handleSessionFeeChange} keyboardType="decimal-pad" placeholderTextColor="#999"/>
                    {sessionFeeError ? <Text style={styles.errorText}>{sessionFeeError}</Text> : null}
                  </>
                )}
              </View>
              <TouchableOpacity style={[styles.signupButton, !isFormValid && styles.signupButtonDisabled]} onPress={handleSignup} disabled={!isFormValid || isLoading}>
                {isLoading ? <ActivityIndicator color="#FFF" size="small" /> : (<><Text style={styles.signupButtonText}>Kayıt Ol</Text><Ionicons name="arrow-forward-circle" size={20} color="white" /></>)}
              </TouchableOpacity>
              <View style={styles.bottomSpace} />
            </Animated.View>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );

  // ---- Web Görünümü ----
  const renderWebLayout = () => (
    <>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#8B5CF6', '#C4B5FD', '#F5F3FF']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.webContainer}>
          <ScrollView contentContainerStyle={styles.webScrollContent}>
            <View style={styles.webFormContainer}>
              <Text style={styles.webTitle}>Hesap Oluştur</Text>
              <Text style={styles.webRoleLabel}>
                {selectedRole === 'customer' ? 'Müşteri olarak' : 'Terapist olarak'}
                  </Text>
              <View style={styles.webInfoTextContainer}>
                  <Text style={styles.infoText}>Zaten hesabın var mı? </Text>
                  <Link href="/auth/login" asChild><TouchableOpacity><Text style={styles.loginLink}>Giriş Yap</Text></TouchableOpacity></Link>
              </View>

              <View style={styles.webInputRow}>
                  <View style={styles.webInputGroup}>
                      <TextInput style={[styles.input, styles.webInput, nameError ? styles.inputError : null]} placeholder="Ad Soyad" value={name} onChangeText={handleNameChange} placeholderTextColor="#999"/>
                      {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                  </View>
                  <View style={styles.webInputGroup}>
                      <TextInput style={[styles.input, styles.webInput, emailError ? styles.inputError : null]} placeholder="E-posta" value={email} onChangeText={handleEmailChange} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999"/>
                      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                  </View>
              </View>

              <View style={styles.webInputRow}>
                  <View style={styles.webInputGroup}>
                       <View style={[styles.passwordContainer, styles.webInput, passwordError ? styles.inputError : null]}>
                         <TextInput style={styles.passwordInput} placeholder="Şifre" secureTextEntry={!showPassword} value={password} onChangeText={handlePasswordChange} placeholderTextColor="#999"/>
                         <TouchableOpacity style={styles.passwordVisibilityBtn} onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" /></TouchableOpacity>
                       </View>
                       {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                  </View>
                  <View style={styles.webInputGroup}>
                       <TextInput style={[styles.input, styles.webInput, phoneError ? styles.inputError : null]} placeholder="Telefon (5xxxxxxxxx)" value={phone} onChangeText={handlePhoneChange} keyboardType="phone-pad" placeholderTextColor="#999"/>
                       {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
                  </View>
              </View>

              <View style={styles.webInputRow}>
                   <View style={styles.webInputGroup}>
                       <TouchableOpacity style={[styles.input, styles.webInput]} onPress={() => setShowDatePicker(true)}><Text style={dateOfBirth !== new Date() ? styles.inputText : styles.inputPlaceholder}>{dateOfBirth !== new Date() ? formatDate(dateOfBirth) : "Doğum Tarihi"}</Text></TouchableOpacity>
                       {showDatePicker && <DateTimePicker value={dateOfBirth} mode="date" display="default" onChange={handleDateChange}/>}
                  </View>
                   <View style={styles.webInputGroup}>
                       <Text style={styles.webLabelText}>Cinsiyet</Text>
                <GenderSelector />
                {genderError ? <Text style={styles.errorText}>{genderError}</Text> : null}
                  </View>
              </View>
              
               <TextInput style={[styles.input, styles.webInput, styles.webAddressInput, addressError ? styles.inputError : null]} placeholder="Adres" value={address} onChangeText={handleAddressChange} multiline numberOfLines={3} placeholderTextColor="#999"/>
                {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}

              {/* --- Terapist Alanları (Web) --- */}
                {selectedRole === 'therapist' && (
                  <>
                   <View style={styles.webInputRow}>
                      <View style={styles.webInputGroup}>
                          <TextInput style={[styles.input, styles.webInput, specialtyError ? styles.inputError : null]} placeholder="Uzmanlık Alanı" value={specialty} onChangeText={handleSpecialtyChange} placeholderTextColor="#999"/>
                    {specialtyError ? <Text style={styles.errorText}>{specialtyError}</Text> : null}
                      </View>
                       <View style={styles.webInputGroup}>
                          <TextInput style={[styles.input, styles.webInput, licenseNumberError ? styles.inputError : null]} placeholder="Lisans Numarası" value={licenseNumber} onChangeText={handleLicenseChange} placeholderTextColor="#999"/>
                    {licenseNumberError ? <Text style={styles.errorText}>{licenseNumberError}</Text> : null}
                      </View>
                  </View>
                  <View style={styles.webInputRow}>
                     <View style={styles.webInputGroup}>
                         <TextInput style={[styles.input, styles.webInput, educationError ? styles.inputError : null]} placeholder="Eğitim Geçmişi" value={educationBackground} onChangeText={handleEducationChange} placeholderTextColor="#999"/>
                    {educationError ? <Text style={styles.errorText}>{educationError}</Text> : null}
                     </View>
                      <View style={styles.webInputGroup}>
                         <TextInput style={[styles.input, styles.webInput, experienceError ? styles.inputError : null]} placeholder="Deneyim Yılı" value={yearsOfExperience} onChangeText={handleExperienceChange} keyboardType="numeric" placeholderTextColor="#999"/>
                    {experienceError ? <Text style={styles.errorText}>{experienceError}</Text> : null}
                    <TextInput style={[styles.input, styles.webInput, sessionFeeError ? styles.inputError : null]} placeholder="Seans Ücreti (Opsiyonel)" value={sessionFee} onChangeText={handleSessionFeeChange} keyboardType="decimal-pad" placeholderTextColor="#999"/>
                    {sessionFeeError ? <Text style={styles.errorText}>{sessionFeeError}</Text> : null}
                  </View>
                 </View>
                  </>
                )}

              <TouchableOpacity style={[styles.signupButton, styles.webSignupButton, !isFormValid && styles.signupButtonDisabled]} onPress={handleSignup} disabled={!isFormValid || isLoading}>
                {isLoading ? <ActivityIndicator color="#FFF" size="small" /> : (<><Text style={styles.signupButtonText}>Kayıt Ol</Text><Ionicons name="arrow-forward-circle" size={20} color="white" /></>)}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </LinearGradient>
    </>
  );

  // Platforma göre render et
  return Platform.select({
    web: renderWebLayout(),
    default: renderMobileLayout(),
  });
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  // --- Genel Stiller (Mobil & Web Ortak Olabilecekler) ---
  container: { // Mobil için ana sarmalayıcı
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradient: { // Arka plan gradient
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  input: { // TEMEL input stili (mobil kullanır, web ezer)
    borderWidth: 1,
    borderColor: '#D1D5DB', // Biraz daha görünür border
    paddingHorizontal: 16,
    height: 55, // Mobil yüksekliği
    borderRadius: 25, // Mobil yuvarlaklığı
    backgroundColor: 'white',
    fontSize: 16,
    color: '#1F2937', // Koyu metin
    marginBottom: 12,
  },
  inputText: { // DatePicker gibi alanlarda seçili metin stili
    fontSize: 16,
    color: '#1F2937',
    // Platforma özel line-height (iOS bug fix)
    lineHeight: Platform.OS === 'ios' ? undefined : undefined,
  },
  inputPlaceholder: { // DatePicker gibi alanlarda placeholder stili
     fontSize: 16,
     color: '#9CA3AF',
     lineHeight: Platform.OS === 'ios' ? undefined : undefined,
  },
  inputError: { // Hatalı input border rengi
    borderColor: '#EF4444',
  },
  errorText: { // Hata mesajı stili
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: Platform.OS === 'web' ? 4 : 16, // Web'de sola daha yakın
  },
  passwordContainer: { // Ortak şifre konteyneri (mobil kullanır, web ezer)
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 25, // Mobil
    paddingHorizontal: 16,
    height: 55, // Mobil
    backgroundColor: 'white',
    marginBottom: 12,
  },
  passwordInput: { // Ortak şifre inputu
    flex: 1,
    height: '100%',
    color: '#1F2937',
    fontSize: 16,
  },
  passwordVisibilityBtn: {
    padding: 8,
  },
  genderContainer: { // Cinsiyet seçici konteyneri
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10, // Butonlar arası boşluk
  },
  genderButton: { // Cinsiyet butonu
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    // marginHorizontal: 4, // Gap kullandığımız için kaldırıldı
    backgroundColor: 'white',
  },
  selectedGender: { // Seçili cinsiyet butonu
    backgroundColor: '#EDE9FE',
    borderColor: '#A376F1',
  },
  genderText: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  selectedGenderText: {
    color: '#8B5CF6', // Daha belirgin tema rengi
    fontWeight: '600',
  },
  addressInput: { // Adres inputu (mobil kullanır, web ezer)
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  signupButton: { // Kayıt ol butonu (mobil kullanır, web ezer)
    backgroundColor: '#8B5CF6', // Ana tema rengi
    borderRadius: 25, // Mobil
    height: 55, // Mobil
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 7,
  },
  signupButtonDisabled: {
    backgroundColor: '#D1D5DB', // Gri disabled rengi
    shadowColor: '#D1D5DB',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  infoText: { // "Zaten hesabın var mı?"
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: { // "Giriş Yap" linki
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
    marginLeft: 5,
  },
  bottomSpace: { // Sadece mobil için scroll sonuna boşluk
    height: 50,
  },
  labelText: { // Mobil için Cinsiyet label'ı
      marginBottom: 8,
      marginLeft: 8,
      color: '#374151',
      fontWeight: '500',
      fontSize: 14,
  },

  // --- Mobil Özel Stiller ---
  content: {
    flex: 1,
    paddingHorizontal: width * 0.06,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: height * 0.05,
  },
  formContainer: {
    flex: 1,
    paddingTop: height * 0.05,
  },
  backButton: { // Mobil geri butonu
    marginBottom: height * 0.02,
    alignSelf: 'flex-start',
    padding: 5,
  },
  title: { // Mobil başlık
    fontSize: width * 0.08,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937', // Koyu renk
  },
  roleLabel: { // Mobil rol etiketi
    fontSize: width * 0.045,
    fontWeight: '500',
    marginBottom: height * 0.02,
    color: '#8B5CF6', // Tema rengi
  },
  infoTextContainer: { // Mobil "Giriş Yap" link konteyneri
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 25,
  },
  inputContainer: { // Mobil inputları saran konteyner
    marginBottom: 15,
  },

  // --- Web Özel Stiller ---
  webContainer: { // Web için ana dış sarmalayıcı
    flex: 1,
    backgroundColor: 'transparent', // Gradient görünsün
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60, // Dikey boşluk
    paddingHorizontal: 20,
  },
  webScrollContent: { // Web için scroll içeriği (ortalamak için)
      alignItems: 'center',
      width: '100%',
      paddingBottom: 60, // Alt boşluk
      justifyContent: 'center',
      flexGrow: 1,
  },
  webFormContainer: { // Web form alanı (kart görünümü)
    width: '100%',
    maxWidth: 750, // Genişliği artırıldı
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 50, // İç boşluk artırıldı
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  webTitle: { // Web başlık
    fontSize: 34, // Font boyutu ayarlandı
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827', // Çok koyu gri
    textAlign: 'center',
  },
  webRoleLabel: { // Web rol etiketi
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 30, // Boşluk artırıldı
    color: '#6366F1',
    textAlign: 'center',
  },
  webInfoTextContainer: { // Web "Giriş Yap" link konteyneri
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40, // Formdan önce daha fazla boşluk
  },
  webInputRow: { // Web input satırı
    flexDirection: 'row',
    width: '100%',
    gap: 25, // Gruplar arası boşluk artırıldı
    marginBottom: 0,
  },
  webInputGroup: { // Web input grubu (input + hata)
    flex: 1,
    marginBottom: 18, // Hata mesajı için yeterli boşluk
  },
  webInput: { // Web inputlarına uygulanacak stil (ortak stili ezer)
     height: 48,
     borderRadius: 8,
     backgroundColor: '#F9FAFB',
     borderColor: '#D1D5DB',
     marginBottom: 0,
     paddingVertical: 10, // İçeriği ortalamak için
     fontSize: 15,
     paddingHorizontal: 14,
     // Ortak input stilinden farklılaşanlar
     shadowOpacity: 0, // Web'de input gölgesi olmasın
     elevation: 0,
  },
  webPasswordContainer: { // Web şifre alanı (ortak stili ezer)
      height: 48,
      borderRadius: 8,
      backgroundColor: '#F9FAFB',
      borderColor: '#D1D5DB',
      marginBottom: 0,
      paddingVertical: 0,
      shadowOpacity: 0,
      elevation: 0,
  },
  webAddressInput: { // Web adres alanı
    height: 100, // Yüksekliği sabit
    textAlignVertical: 'top',
    paddingTop: 12,
    marginTop: 10, // Önceki satırdan boşluk
    // webInput stilini kullanır
  },
  webLabelText: { // Web için Cinsiyet label'ı
     marginBottom: 8,
     marginLeft: 4,
     color: '#374151',
     fontSize: 14,
     fontWeight: '500',
  },
  webGenderContainer: { // Web cinsiyet seçici konteyneri
     marginTop: 4,
     marginBottom: 0,
     gap: 15, // Butonlar arası boşluk
  },
  webGenderButton: { // Web cinsiyet butonu
      paddingVertical: 10, // Biraz daha az padding
      marginHorizontal: 0,
  },
  webSignupButton: { // Web kayıt butonu (ortak stili ezer)
    alignSelf: 'center',
    marginTop: 30, // Form sonrası boşluk
    paddingHorizontal: 60,
    height: 50, // Yüksekliği ayarla
    borderRadius: 8, // Köşeli
    shadowOpacity: 0.25, // Hafif gölge
    elevation: 5,
  },
}); 