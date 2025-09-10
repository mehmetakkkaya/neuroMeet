import React, { useState } from 'react';
import { Image, View, StyleSheet, ActivityIndicator, ImageSourcePropType, ImageStyle, StyleProp, ViewStyle } from 'react-native';

interface LazyImageProps {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  placeholderColor?: string;
}

/**
 * LazyImage component for efficiently loading images with placeholder
 * 
 * @param source - Image source (uri or require)
 * @param style - Style for the image
 * @param containerStyle - Style for the container view
 * @param resizeMode - Image resize mode
 * @param placeholderColor - Color of the placeholder background
 */
const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  containerStyle,
  resizeMode = 'cover',
  placeholderColor = '#E5E7EB',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Handle successful image load
  const handleLoad = () => {
    setIsLoading(false);
  };

  // Handle image load error
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {isLoading && (
        <View style={[styles.placeholder, { backgroundColor: placeholderColor }]}>
          <ActivityIndicator size="small" color="#A376F1" />
        </View>
      )}
      
      <Image
        source={source}
        style={[
          styles.image,
          style,
          isLoading && styles.imageLoading,
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {hasError && (
        <View style={styles.errorContainer}>
          <Image 
            source={require('@/assets/images/error-placeholder.png')}
            style={styles.errorImage}
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoading: {
    opacity: 0,
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorImage: {
    width: '50%',
    height: '50%',
    opacity: 0.5,
  },
  errorText: {
    color: '#A376F1',
    fontWeight: '500',
    fontSize: 14,
  },
});

export default LazyImage; 