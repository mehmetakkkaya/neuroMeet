import { Redirect } from 'expo-router';

// Bu sayfa, bağımsız olarak therapist profil sayfasına yönlendirme yapar
export default function TherapistProfileRedirect() {
  return <Redirect href="/(tabs)/profile/therapist" />;
} 