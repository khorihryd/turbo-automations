import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import OssScreen from './OssScreen';
import { LasikScreen } from './LasikScreen';
import DptScreen from './DptScreen';

export default function DashboardScreen() {
  const [showOss, setShowOss] = useState(false);
  const [showLasik,setShowLasik] = useState(false);
  const [showDpt,setShowDpt] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (showOss) {
    return <OssScreen />;
  }
  if (showLasik) {
    return <LasikScreen />;
  }
  if (showDpt) {
    return <DptScreen />;
  }

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
          <TouchableOpacity 
            style={styles.primaryCard} 
            onPress={() => setShowOss(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconBox}>
              <MaterialCommunityIcons name="monitor-dashboard" size={32} color="#F8FAFC" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>OPEN OSS SCREEN</Text>
              <Text style={styles.cardDescription}>Inisialisasi sistem otomasi dan monitoring.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#334155" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.primaryCard} 
            onPress={() => setShowLasik(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconBox}>
              <MaterialCommunityIcons name="monitor-dashboard" size={32} color="#F8FAFC" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>OPEN LASIK SCREEN</Text>
              <Text style={styles.cardDescription}>Inisialisasi sistem otomasi dan monitoring.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#334155" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.primaryCard} 
            onPress={() => setShowDpt(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconBox}>
              <MaterialCommunityIcons name="monitor-dashboard" size={32} color="#F8FAFC" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>OPEN DPT SCREEN</Text>
              <Text style={styles.cardDescription}>Inisialisasi sistem otomasi dan monitoring.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#334155" />
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