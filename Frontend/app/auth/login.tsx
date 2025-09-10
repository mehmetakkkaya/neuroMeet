import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Linking
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Link, router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLogin } from '../../src/hooks/useApi';
import { LoginRequest } from '../../src/types/api.types';
import api from '../../src/services/api';

// Layout Animation için Android desteği
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Email doğrulama için regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Ekran boyutlarını al
const { width, height } = Dimensions.get('window');

const FULL_TAGLINE = "Anlaşılmaya ve iyileşmeye hoş geldin.";
const ANIMATION_DELAY = 70; // Harfler arası gecikme (ms)

export default function LoginScreen() {
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Form doğrulama state'leri
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  
  // Input odaklanma durumları
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // transform ile paddingTop yerine translateY kullanacağız
  const contentOffsetY = useRef(new Animated.Value(0)).current;
  
  // Input ölçeklendirme animasyonları
  const emailScale = useRef(new Animated.Value(1)).current;
  const passwordScale = useRef(new Animated.Value(1)).current;
  
  // Logo boyutu için animasyon - transform ile ölçeklendireceğiz
  const logoScale = useRef(new Animated.Value(1)).current;
  
  // Login hook'unu component seviyesinde tanımla
  const loginHook = useLogin();
  
  const [visibleTagline, setVisibleTagline] = useState('');
  const taglineIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval referansı
  
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
    
    // Animasyonlu geçişler - sadece transform özelliklerini animate ediyoruz
    Animated.parallel([
      Animated.timing(contentOffsetY, {
        toValue: -height * 0.06, // Yukarı kaydırmak için negatif değer kullan
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(logoScale, {
        toValue: 0.6, // 0.6 kat boyut
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
    
    // Animasyonlu geçişler - sadece transform özelliklerini animate ediyoruz
    Animated.parallel([
      Animated.timing(contentOffsetY, {
        toValue: 0, // Normal pozisyona geri dön
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(logoScale, {
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
  
  // Sayfa yüklendiğinde animasyonları başlat
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Form validasyonunu kontrol et
  useEffect(() => {
    validateForm();
  }, [email, password]);
  
  // Email değiştiğinde doğrulama
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
  
  // Şifre değiştiğinde doğrulama
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
  
  // Form validasyonu
  const validateForm = () => {
    const isEmailValid = email.trim() !== '' && EMAIL_REGEX.test(email);
    const isPasswordValid = password.trim() !== '' && password.length >= 6;
    setIsFormValid(isEmailValid && isPasswordValid);
  };

  // Input odaklanma animasyonları
  const handleEmailFocus = () => {
    setEmailFocused(true);
    Animated.spring(emailScale, {
      toValue: 1.02,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };
  
  const handleEmailBlur = () => {
    setEmailFocused(false);
    Animated.spring(emailScale, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePasswordFocus = () => {
    setPasswordFocused(true);
    Animated.spring(passwordScale, {
      toValue: 1.02,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePasswordBlur = () => {
    setPasswordFocused(false);
    Animated.spring(passwordScale, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };
  
  // Buton basma animasyonu
  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };
  
  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = () => {
    // Form validasyonu
    if (!isFormValid) {
      // Spesifik hata mesajları gösterilmiyor, çünkü gerçek zamanlı olarak zaten gösteriliyor
      return;
    }
    
    setIsLoading(true);
    
    // Buton küçültme animasyonu
    Animated.spring(buttonScale, {
      toValue: 0.95,
      friction: 8,
      useNativeDriver: true,
    }).start();
    
    // API ile login işlemi
    const loginData: LoginRequest = {
      email: email.trim(),
      password: password
    };
    
    loginHook.request(loginData)
      .then(response => {
        console.log('Giriş başarılı:', response);
        
        // Token'ı API servisine kaydet
        if (response && response.token) {
          api.setToken(response.token);
          console.log('Token API servisine kaydedildi');
        } else {
          console.warn('Token alınamadı');
        }
        
        // Başarılı login sonrası ana sayfaya yönlendirme
        router.replace('/(tabs)');
      })
      .catch(error => {
        console.error('Giriş hatası:', error);
        Alert.alert(
          'Giriş Hatası',
          'Email veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyiniz.',
          [{ text: 'Tamam' }]
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Web için tagline animasyonunu başlatan useEffect
  useEffect(() => {
    // Sadece web'de ve component mount olduğunda çalışsın
    if (Platform.OS === 'web') {
      let index = 0;
      setVisibleTagline(''); // Başlangıçta temizle

      // Önceki interval varsa temizle
      if (taglineIntervalRef.current) {
        clearInterval(taglineIntervalRef.current);
      }

      taglineIntervalRef.current = setInterval(() => {
        if (index < FULL_TAGLINE.length) {
          // Sonraki harfi ekle (slice daha güvenli olabilir)
          setVisibleTagline(prev => FULL_TAGLINE.slice(0, index + 1));
          index++;
        } else {
          // Animasyon bittiğinde interval'ı temizle
          if (taglineIntervalRef.current) {
            clearInterval(taglineIntervalRef.current);
          }
        }
      }, ANIMATION_DELAY);

      // Cleanup fonksiyonu: Component unmount olduğunda interval'ı temizle
      return () => {
        if (taglineIntervalRef.current) {
          clearInterval(taglineIntervalRef.current);
        }
      };
    }
  }, []); // Boş dependency array, sadece mount olduğunda çalışır

  // ---- Mobil Görünüm Render Fonksiyonu ----
  const renderMobileLayout = () => {
  return (
    <>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#E2D1F9', '#FFFFFF']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Stack.Screen 
          options={{
            headerShown: false,
          }}
        />
        <SafeAreaView style={styles.container}>
          <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={Platform.OS === 'ios' ? 50 : 80}
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
            <Animated.View 
              style={[
                  styles.content, // Mobil için ana içerik stili
                { 
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideUpAnim },
                    { translateY: contentOffsetY }
                  ],
                }
              ]}
            >
              <Animated.View style={[
                styles.logoContainer, 
                { 
                    marginBottom: keyboardVisible ? height * 0.01 : 
                                  Platform.select({ web: height * 0.02, default: height * 0.03 }) 
                }
              ]}>
                <Animated.Image 
                  source={require('@/assets/images/NeuroMeetIcon.png')}
                  style={[
                    styles.logo,
                      Platform.OS === 'web' && styles.logoWeb, // Bu artık burada olmamalı ama şimdilik kalsın
                    { 
                      transform: [{ scale: logoScale }]
                    }
                  ]}
                  resizeMode="contain"
                />
              </Animated.View>
              
              <Animated.Text style={[
                styles.title,
                { fontSize: keyboardVisible ? 28 : 32 }
              ]}>Login</Animated.Text>
              
              <Animated.View style={[
                styles.infoTextContainer,
                { marginBottom: keyboardVisible ? height * 0.02 : height * 0.06 }
              ]}>
                <Text style={styles.infoText}>Don't have an account? </Text>
                <Link href="/auth/role-select" asChild>
                  <TouchableOpacity>
                    <Text style={styles.signUpText}>sign up</Text>
                  </TouchableOpacity>
                </Link>
              </Animated.View>

              <View style={styles.inputContainer}>
                <Animated.View 
                  style={[
                    styles.emailInputContainer, 
                    emailError ? styles.inputError : null,
                    emailFocused ? styles.inputFocused : null,
                    { transform: [{ scale: emailScale }] }
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color="#888" style={styles.emailIcon} />
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Email Address"
                    placeholderTextColor="#BBBBBB"
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={handleEmailFocus}
                    onBlur={handleEmailBlur}
                  />
                </Animated.View>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                
                <Animated.View 
                  style={[
                    styles.passwordContainer, 
                    passwordError ? styles.inputError : null,
                    passwordFocused ? styles.inputFocused : null,
                    { transform: [{ scale: passwordScale }] }
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    placeholderTextColor="#BBBBBB"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={handlePasswordChange}
                    onFocus={handlePasswordFocus}
                    onBlur={handlePasswordBlur}
                  />
                  <TouchableOpacity 
                    style={styles.passwordVisibilityBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#888" 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.forgotPassword}
                    onPress={() => router.push("/auth/forgot_password" as any)}
                  >
                    <Text style={styles.forgotText}>FORGOT</Text>
                  </TouchableOpacity>
                </Animated.View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              </View>

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  style={[styles.loginButton, !isFormValid && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={!isFormValid || isLoading}
                  onPressIn={handleButtonPressIn}
                  onPressOut={handleButtonPressOut}
                  activeOpacity={0.9}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Login</Text>
                      <Ionicons name="arrow-forward-circle" size={20} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {!keyboardVisible && (
                <Animated.View style={{
                  ...styles.followUsContainer,
                  opacity: fadeAnim
                }}>
                  <Text style={styles.followUsText}>followUs</Text>
                  <TouchableOpacity onPress={()=>{
                   Linking.openURL("https://www.instagram.com/berkecankcygt/") 
                  }} style={styles.instagramButton}>
                    <LinearGradient
                      colors={['#FEDA75', '#FA7E1E', '#D62976', '#962FBF', '#4F5BD5']}
                      style={styles.instagramGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <FontAwesome name="instagram" size={24} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
  };

  // ---- Web Görünümü Render Fonksiyonu ----
  const renderWebLayout = () => {
    return (
      <>
        <StatusBar style="dark" />
        {/* Web için Gradient Arka Plan */}
        <LinearGradient
          colors={['#8B5CF6', '#C4B5FD', '#F5F3FF']} // Violet -> Açık Violet -> Çok Açık Lavanta
          style={styles.webGradient}
          // Yönü soldan sağa yap
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {/* Stack Screen options web'de de gizli kalsın */}
           <Stack.Screen options={{ headerShown: false }} /> 
          {/* İki sütunlu yapıyı Gradient içine alalım */}
          <View style={styles.webContainer}> 
             {/* Sol Sütun (Logo ve Marka) */}
            <View style={styles.webLeftColumn}>
              <View style={styles.webLogoContainer}>
                 <Animated.Image 
                    source={require('@/assets/images/NeuroMeetIcon.png')}
                    style={[
                      styles.logo, 
                      styles.logoWeb,
                    ]}
                    resizeMode="contain"
                  />
                 {/* Logo Altı Yazı (Animasyonlu) */}
                 <Text style={styles.webTagline}>{visibleTagline}</Text>
              </View>
              {/* Alt boşluk için */}
              <View /> 
            </View>

            {/* Sağ Sütun (Form) */}
            <View style={styles.webRightColumn}>
              <View style={styles.webFormWrapper}>
                  <Text style={styles.webTitle}>Giriş Yap</Text>
                  <View style={styles.webInfoTextContainer}>
                      <Text style={styles.infoText}>Hesabın yok mu? </Text>
                      <Link href="/auth/role-select" asChild>
                        <TouchableOpacity>
                          <Text style={styles.signUpText}>Kayıt Ol</Text>
                        </TouchableOpacity>
                      </Link>
                  </View>

                  <View style={styles.webInputContainer}>
                      <Animated.View 
                        style={[
                          styles.emailInputContainer, 
                          styles.webInput, 
                          emailError ? styles.inputError : null,
                          emailFocused ? styles.inputFocused : null,
                          { transform: [{ scale: emailScale }] }
                        ]}
                      >
                        <Ionicons name="mail-outline" size={20} color="#888" style={styles.emailIcon} />
                        <TextInput
                          style={styles.emailInput}
                          placeholder="E-posta Adresi"
                          placeholderTextColor="#BBBBBB"
                          value={email}
                          onChangeText={handleEmailChange}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onFocus={handleEmailFocus}
                          onBlur={handleEmailBlur}
                        />
                      </Animated.View>
                      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                      
                      <Animated.View 
                        style={[
                          styles.passwordContainer, 
                          styles.webInput, 
                          passwordError ? styles.inputError : null,
                          passwordFocused ? styles.inputFocused : null,
                          { transform: [{ scale: passwordScale }] }
                        ]}
                      >
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Şifre"
                          placeholderTextColor="#BBBBBB"
                          secureTextEntry={!showPassword}
                          value={password}
                          onChangeText={handlePasswordChange}
                          onFocus={handlePasswordFocus}
                          onBlur={handlePasswordBlur}
                        />
                        <TouchableOpacity 
                          style={styles.passwordVisibilityBtn}
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Ionicons 
                            name={showPassword ? "eye-off-outline" : "eye-outline"} 
                            size={20} 
                            color="#888" 
                          />
                        </TouchableOpacity>
                         <TouchableOpacity 
                            style={styles.forgotPassword}
                            onPress={() => router.push("/auth/forgot_password" as any)}
                         >
                            <Text style={styles.forgotText}>UNUTTUM?</Text>
                         </TouchableOpacity>
                      </Animated.View>
                      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                  </View>

                  <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity 
                      style={[styles.loginButton, styles.webLoginButton, !isFormValid && styles.loginButtonDisabled]}
                      onPress={handleLogin}
                      disabled={!isFormValid || isLoading}
                      onPressIn={handleButtonPressIn}
                      onPressOut={handleButtonPressOut}
                      activeOpacity={0.9}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Text style={styles.loginButtonText}>Giriş Yap</Text>
                          <Ionicons name="arrow-forward-circle" size={20} color="white" />
                        </>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                  <View style={styles.webFollowUsContainer}>
                     <Text style={styles.followUsText}>Bizi Takip Et</Text>
                     <TouchableOpacity onPress={()=>{Linking.openURL("https://www.instagram.com/berkecankcygt/")}} style={styles.instagramButton}>
                        <LinearGradient colors={['#FEDA75', '#FA7E1E', '#D62976', '#962FBF', '#4F5BD5']} style={styles.instagramGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                           <FontAwesome name="instagram" size={24} color="white" />
                        </LinearGradient>
                     </TouchableOpacity>
                  </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </>
    );
  };

  // Ana return ifadesi: Platforma göre layout seçimi
  return Platform.select({
    web: renderWebLayout(),
    default: renderMobileLayout(),
  });
}

// --- StyleSheet --- 
const styles = StyleSheet.create({
  // --- Mobil Stiller --- 
  container: { // Sadece mobil için
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradient: { // Sadece mobil için
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollContent: { // Sadece mobil için
    flexGrow: 1,
    paddingBottom: height * 0.05,
  },
  content: { // Sadece mobil için ana içerik alanı
    flex: 1,
    paddingHorizontal: width * 0.08,
    paddingTop: height * 0.08,
    backgroundColor: 'transparent',
  },
  logoContainer: { // Mobil için
    alignItems: 'center',
  },
  title: { // Mobil için
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoTextContainer: { // Mobil için
    flexDirection: 'row',
    marginBottom: height * 0.06,
  },
  followUsContainer: { // Mobil için
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },

  // --- Web'e Özel Stiller --- 
  webContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  webLeftColumn: {
    flex: 1.2, 
    padding: 50, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  webRightColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webLogoContainer: {
     alignItems: 'center', // Logoyu ve altındaki yazıyı ortala
     width: '100%',
  },
  logoWeb: { // Web için logo boyutu - BÜYÜTÜLDÜ
    width: Math.min(width * 0.35, 350), // Daha büyük boyut
    height: Math.min(width * 0.35, 350), 
    marginBottom: 25, // Altındaki yazı için boşluk
  },
  webTagline: { // Logo altı yazı stili
     fontSize: 18,
     color: 'white', // Yeni beyaz renk
     textAlign: 'center',
     marginTop: 15, // Logodan sonra boşluk
     minHeight: 25, // Metin yokken bile yer kaplasın (isteğe bağlı)
  },
  webFormWrapper: {
      width: '100%',
      maxWidth: 400,
  },
  webTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1F2937', // Daha koyu başlık rengi
    textAlign: 'center',
  },
  webInfoTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  webInputContainer: {
      marginBottom: 20,
  },
  webInput: { // Web inputları için ek/geçersiz kılan stiller
      borderRadius: 8, // Hafif yuvarlak köşeler
      height: 50,
      paddingVertical: 0,
      backgroundColor: '#F9FAFB', // Hafif gri input arka planı
      borderColor: '#D1D5DB',
      marginTop: 10,
  },
  webLoginButton: { // Web butonu için ek/geçersiz kılan stiller
      borderRadius: 8,
      height: 50,
      shadowOpacity: 0.2, // Gölgeyi biraz artır
  },
  webFollowUsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 40,
  },

  // --- Ortak Kullanılan Stiller --- 
  logo: { // Temel logo stili (mobil öncelikli)
    borderRadius:48,
    width: width * 0.5,
    height: width * 0.5,
    maxWidth: 250,
    maxHeight: 250,
  },
  infoText: {
    fontSize: 16,
    color: '#6B7280', // Biraz daha açık gri
  },
  signUpText: {
    fontSize: 16,
    color: '#6366F1', // Tema rengi
    fontWeight: '600',
    marginLeft: 5, // Arada boşluk
  },
  inputContainer: { // Mobil için
    marginBottom: 24,
  },
  emailInputContainer: { // Ortak temel stil
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 25, // Mobil için
    paddingHorizontal: 20,
    paddingVertical: 5, // Mobil için
    marginBottom: 8, // Mobil için
    height: 55, // Mobil için
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  passwordContainer: { // Ortak temel stil
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 25, // Mobil için
    paddingHorizontal: 20,
    paddingVertical: 5, // Mobil için
    height: 55, // Mobil için
    backgroundColor: 'white',
    marginTop: 15, // Mobil için
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputError: {
    borderColor: '#EF4444', // Daha canlı kırmızı
    borderWidth: 1,
  },
  inputFocused: {
    borderColor: '#6366F1', // Tema rengi border
    // Platforma özel odak efekti
    ...(Platform.OS === 'web' ? {boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)'} : { shadowColor: '#9D6FF0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 })
  },
  errorText: {
    color: '#EF4444', // Daha canlı kırmızı
    fontSize: 12,
    marginLeft: 16,
    marginTop: 4, // Hata mesajı için biraz üst boşluk
    marginBottom: 4, // Hata mesajı için biraz alt boşluk
  },
  emailIcon: {
    marginRight: 12,
  },
  emailInput: {
    flex: 1,
    height: '100%', 
    color: '#1F2937', // Koyu metin rengi
    fontSize: 16, // Font boyutunu eşitle
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    color: '#1F2937',
    fontSize: 16,
  },
  passwordVisibilityBtn: {
    padding: 8,
  },
  forgotPassword: {
    padding: 4,
    marginLeft: 8,
  },
  forgotText: {
    color: '#6366F1', // Tema rengi
    fontSize: 12,
    fontWeight: '500',
  },
  loginButton: { // Ortak temel stil
    backgroundColor: '#6366F1', // Ana tema rengi
    borderRadius: 25, // Mobil için
    height: 55, // Mobil için
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20, // Mobil için
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 }, // Gölgeyi belirginleştir
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF', // Daha koyu gri
    shadowColor: '#9CA3AF',
    shadowOpacity: 0.2,
    elevation: 2,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  followUsText: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 16,
    fontWeight: '500',
  },
  instagramButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  instagramGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webGradient: {
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
}); 