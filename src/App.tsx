import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';

// 1. Import QueryClient dan Provider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 2. Inisialisasi QueryClient di luar komponen
const queryClient = new QueryClient();

function Root() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ❌ Belum login
  if (!session) {
    return <LoginScreen />;
  }

  // ✅ Sudah login
  return <DashboardScreen />;
}

export default function App() {
  return (
    // 3. Bungkus aplikasi dengan QueryClientProvider
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </QueryClientProvider>
  );
}