import { View, Text, Button } from 'react-native';
import { supabase } from '../lib/supabase';

export default function DashboardScreen() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>
        Dashboard
      </Text>

      <Text style={{ marginBottom: 20 }}>
        Selamat datang! Anda berhasil login.
      </Text>

      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
