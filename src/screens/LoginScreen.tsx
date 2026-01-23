import React, { useState } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons'; // Pastikan sudah install expo-vector-icons

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) Alert.alert("ACCESS DENIED", error.message);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        {/* Logo/Branding Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoSquare}>
            <Ionicons name="shield-checkmark" size={32} color="#F8FAFC" />
          </View>
          <Text style={styles.brandTitle}>SYSTEM ACCESS</Text>
          <Text style={styles.brandSubtitle}>ENTER YOUR CREDENTIALS TO PROCEED</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              placeholder="user@system.local"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SECURE PASSWORD</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#475569"
              secureTextEntry
              onChangeText={setPassword}
              style={styles.input}
            />
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, loading && { opacity: 0.6 }]} 
            onPress={signIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "AUTHENTICATING..." : "AUTHORIZE ACCESS"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>ENCRYPTED SESSION SECURED BY SUPABASE</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A", // Deep Navy
  },
  inner: {
    flex: 1,
    padding: 30,
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoSquare: {
    width: 60,
    height: 60,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 20,
  },
  brandTitle: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
  },
  brandSubtitle: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1.5,
    marginTop: 8,
  },
  formSection: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: "#334155", // Warna Slate yang tegas
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#475569",
  },
  loginButtonText: {
    color: "#F8FAFC",
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 14,
  },
  footerText: {
    textAlign: "center",
    color: "#334155",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 40,
  }
});