import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Dimensions,
  StatusBar,
  Animated
} from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpText = useRef(new Animated.Value(50)).current;
  const slideUpButtons = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    // Run animations when component mounts
    Animated.sequence([
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Text slide up animation
      Animated.timing(slideUpText, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      // Buttons slide up animation
      Animated.timing(slideUpButtons, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Navigation with animation
  const navigateTo = (route: string) => {
    // Fade out animation before navigation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.push(route as any);
    });
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Video arka plan */}
        <Video
          source={require('../assets/videos/firstpage_wallpaper.mp4')}
          style={styles.backgroundVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
        />
        
        {/* Gradient arka plan (yarı saydam) */}
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.7)', 'rgba(139, 92, 246, 0.8)']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* App intro content */}
        <SafeAreaView style={styles.contentContainer}>
          <Stack.Screen 
            options={{
              headerShown: false,
            }}
          />
          <View style={styles.content}>
            <Animated.View 
              style={[
                styles.textContainer, 
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideUpText }]
                }
              ]}
            >
              <Text style={styles.title}>Hello.</Text>
              <Text style={styles.subtitle}>Let's Get Started!</Text>
            </Animated.View>

            <Animated.View 
              style={[
                styles.buttonContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideUpButtons }]
                }
              ]}
            >
              <TouchableOpacity
                style={styles.signUpButton}
                onPress={() => navigateTo('/auth/role-select')}
                activeOpacity={0.8}
              >
                <Text style={styles.signUpButtonText}>Sign Up</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigateTo('/auth/login')}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>Log In</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6366F1',
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    padding: width * 0.06, // Responsive padding
    justifyContent: 'space-between',
  },
  textContainer: {
    marginTop: height * 0.15,
  },
  title: {
    fontSize: Math.min(width * 0.11, 46), // Responsive but capped
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(width * 0.06, 24), // Responsive but capped
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: height * 0.01,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: height * 0.06,
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: Math.min(width, height) * 0.06,
    height: height * 0.07,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signUpButtonText: {
    color: '#6366F1',
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: Math.min(width, height) * 0.06,
    height: height * 0.07,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: 'bold',
  },
}); 