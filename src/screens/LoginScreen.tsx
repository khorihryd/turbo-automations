import { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) Alert.alert(error.message);
  };

  return (
    <View style={{ padding: 20, display:'flex', justifyContent:"center", alignItems:"center" }}>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        onChangeText={setEmail}
        style={{ marginBottom: 12 }}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        onChangeText={setPassword}
        style={{ marginBottom: 12 }}
      />
      <Button title="Login" onPress={signIn} />
    </View>
  );
}
