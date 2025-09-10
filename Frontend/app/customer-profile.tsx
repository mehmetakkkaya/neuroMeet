import { Redirect } from 'expo-router';

// Bu sayfa, bağımsız olarak customer profil sayfasına yönlendirme yapar
export default function CustomerProfileRedirect() {
  return <Redirect href="/(tabs)/profile/customer" />;
} 