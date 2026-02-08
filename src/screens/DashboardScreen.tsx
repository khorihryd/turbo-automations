import React, { useState,useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar,Alert } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchFeatureFlags, checkIsDeveloper } from '../lib/featureControl';
import OssScreen from './OssScreen';
import LasikScreen  from './LasikScreen';
import DptScreen from './DptScreen';

import * as MediaLibrary from 'expo-media-library';

export default function DashboardScreen() {
  const [showOss, setShowOss] = useState(false);
  const [showLasik,setShowLasik] = useState(false);
  const [showDpt,setShowDpt] = useState(false);
  const [loadingFeature, setLoadingFeature] = useState(false);

// 1. Fetch data maintenance dengan caching 5 menit
  const { data: featureSettings } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: fetchFeatureFlags,
    staleTime: 1000 * 60 * 5, // Cache tahan 5 menit
  });

// 2. Logika navigasi dengan Bypass Developer
  const handleNavigation = async (featureName: string, setVisible: (v: boolean) => void) => {
    const isDev = await checkIsDeveloper();
    const feature = featureSettings?.find(f => f.feature_name === featureName);

    // Jika fitur maintenance DAN user bukan developer, maka blokir
    if (feature && !feature.is_active && !isDev) {
      Alert.alert(
        "Maintenance Mode",
        feature.message || "Fitur sedang diperbaiki.",
        [{ text: "Mengerti" }]
      );
      return;
    }

    // Jika developer atau fitur aktif, silakan masuk
    setVisible(true);
  };



useEffect(() => {
  const requestPermissionsOnOpen = async () => {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Izin Penyimpanan',
          'Aplikasi memerlukan izin penyimpanan untuk menyimpan hasil scraping ke format Excel.',
          [
            {
              text: 'Berikan Izin',
              onPress: async () => {
                const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
                if (newStatus === 'granted') {
                  console.log('Storage permission granted from dashboard');
                }
              }
            },
            {
              text: 'Nanti',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  // Minta izin saat dashboard dibuka
  requestPermissionsOnOpen();
}, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (showOss) return <OssScreen />;
  if (showLasik) return <LasikScreen />;
  if (showDpt) return <DptScreen />;

  return (
    <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#19183B" />
      
      {/* Top Decoration */}
      <View style={styles.headerDecoration}>
        <View style={styles.line} />
        <Text style={styles.systemCode}>ID-772-TECH</Text>
      </View>

      <View style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.title}>DASHBOARD</Text>
          <View style={styles.underline} />
          <Text style={styles.subtitle}>
            ACCESS GRANTED. WELCOME TO THE SYSTEM INTERFACE.
          </Text>
        </View>

        {/* Menu Cards */}
        <View style={styles.menuContainer}>
        {/* Tombol OSS */}
          <TouchableOpacity 
            style={styles.primaryCard} 
            onPress={() => handleNavigation('oss', setShowOss)}
          >
            {/* Isi Card ... */}
            <Text style={styles.cardTitle}>CEK OSS</Text>
            {/* Tambahkan indikator visual jika fitur sedang maintenance (opsional) */}
            {!featureSettings?.find(f => f.feature_name === 'oss')?.is_active && (
              <Text style={{color: '#EAB308', fontSize: 10}}> (🛠 MAINTENANCE)</Text>
            )}
          </TouchableOpacity>

        {/* Tombol LASIK */}
          <TouchableOpacity 
            style={styles.primaryCard} 
            onPress={() => handleNavigation('lasik', setShowLasik)}
          >
            <Text style={styles.cardTitle}>CEK LASIK</Text>
          </TouchableOpacity>

        {/* Tombol DPT */}
          <TouchableOpacity 
            style={styles.primaryCard} 
            onPress={() => handleNavigation('dpt', setShowDpt)}
          >
            <Text style={styles.cardTitle}>CEK DPT</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryCard} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout-variant" size={20} color="#94A3B8" />
            <Text style={styles.logoutText}>TERMINATE SESSION (LOGOUT)</Text>
          </TouchableOpacity>
        </View>

        {/* System Footer Decoration */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>SECURITY LEVEL: ENHANCED</Text>
          <Text style={styles.footerLabel}>LAST SYNC: {new Date().toLocaleTimeString()}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A", // Deep Navy
  },
  headerDecoration: {
    paddingHorizontal: 25,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  line: {
    height: 1,
    flex: 1,
    backgroundColor: '#1E293B',
    marginRight: 15,
  },
  systemCode: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
  },
  welcomeSection: {
    marginBottom: 50,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 6,
  },
  underline: {
    height: 4,
    width: 40,
    backgroundColor: "#3B82F6",
    marginTop: 10,
    marginBottom: 15,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    lineHeight: 18,
  },
  menuContainer: {
    gap: 16,
  },
  primaryCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#334155",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cardIconBox: {
    width: 56,
    height: 56,
    backgroundColor: "#334155",
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 15,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  cardDescription: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
  },
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 10,
  },
  logoutText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginLeft: 10,
  },
  footerInfo: {
    position: 'absolute',
    bottom: 30,
    left: 25,
    right: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 15,
  },
  footerLabel: {
    color: "#334155",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  }
});