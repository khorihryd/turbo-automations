import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import DashboardScreen from '../screens/DashboardScreen';

// Import komponen yang sudah kita redesign sebelumnya
import HeaderPanel from '../components/HeaderPanel';
import TabSwitcher from "../components/TabSwitcher";
import ConsolePanel from "../components/ConsolePanel";
import WebViewPanel from "../components/WebViewPanel";
import ProgressPanel from "../components/ProgressPanel";

const OssScreen = () => {
  const [activeTab, setActiveTab] = useState<"console" | "webview">("console");
    const [showDashboard,setShowDashboard] = useState(false);

    const handleBackBtn = ()=>{
      setShowDashboard(true)
    }

    if (showDashboard){
        return <DashboardScreen />
    }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#19183B" />
      
      {/* Header Tetap di Atas */}
      <HeaderPanel backto={handleBackBtn} />

      <View style={styles.mainContent}>
        {/* Kontrol Navigasi Tab */}
        <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />

        {/* Dynamic Display Area */}
        <View style={styles.displayWrapper}>
          {activeTab === "console" ? <ConsolePanel /> : <WebViewPanel />}
        </View>

        {/* Bottom Monitoring Panel */}
        <View style={styles.bottomSection}>
          <ProgressPanel />
        </View>

        {/* System Footer Metadata */}
        <View style={styles.systemFooter}>
          <Text style={styles.footerBrand}>OSS TERMINAL v1.0.4</Text>
          <View style={styles.systemStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>ENCRYPTED CONNECTION</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OssScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A", // Deep Navy Utama
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  displayWrapper: {
    flex: 2, // Memberikan ruang lebih besar untuk area utama (Console/Web)
    marginVertical: 8,
  },
  bottomSection: {
    flex: 1, // Progress panel mendapat porsi yang cukup di bawah
    maxHeight: 250, // Membatasi agar tidak terlalu memakan tempat
    marginBottom: 10,
  },
  systemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    marginTop: 5,
  },
  footerBrand: {
    color: "#334155",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
    marginRight: 6,
  },
  statusText: {
    color: "#334155",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});