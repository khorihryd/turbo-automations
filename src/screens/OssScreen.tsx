import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StatusBar, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from 'react-native-webview';

// Import Screens (Internal Logic)
import DashboardScreen from './DashboardScreen';

// Import Komponen (Sesuai kode awal Anda)
import HeaderPanel from '../components/HeaderPanel';
import TabSwitcher from '../components/TabSwitcher';
import ConsolePanel from '../components/ConsolePanel';
import WebViewPanel from '../components/WebViewPanel';

// Import Modular Files
import { COLORS } from '../constants/Colors';
import { CONFIG } from '../constants/Config';
import { DptTabType } from '../interfaces/Navigation';
import { usePermissions } from '../hooks/usePermissions';
import { useExcelHandler } from '../hooks/useExcelHandler';
import { useOssAutomation } from '../hooks/useOssAutomation';
import { CaptchaService } from '../services/CaptchaService';
import AsyncStorage from '@react-native-async-storage/async-storage';



const OssScreen = () => {
  // State UI Lokal
  const [activeTab, setActiveTab] = useState<DptTabType>("console");
  const [showDashboard, setShowDashboard] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [balance, setBalance] = useState<string>('Checking...');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const key = await AsyncStorage.getItem('API_KEY');
    if (key) { setApiKey(key); checkBalance(key); } else { setShowModal(true); }
  };

  const checkBalance = async (key: string) => {
    const service = new CaptchaService(key);
    const bal = await service.getBalance();
    setBalance(bal);
  };

  // Refs
  const webViewRef = useRef<WebView | null>(null);

  // Helper Log
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('id-ID');
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 50)]);
  };

  // --- Integrasi Hooks Modular ---
  
  // 1. Hook Perizinan
  const { permissionGranted } = usePermissions(addLog);

  // 2. Hook Excel (Import & Export)
  const { 
    excelData,
    excelName, 
    pickExcelForOss,
    exportResults 
  } = useExcelHandler(addLog);

  // 3. Hook Automasi (Inti Logika)
  const {
    isRun,
    progress,
    results,
    currentUrl,
    pilotRun,
    stopRun,
    onMessage,
    onPageLoadFinished
  } = useOssAutomation(excelData, webViewRef, addLog, apiKey);

  // --- Handlers ---
  const handleBackBtn = () => {
    setShowDashboard(true);
  };

  if (showDashboard) {
    return <DashboardScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.HEADER} />
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Setup API Key</Text>
          <TextInput 
            style={styles.input} placeholder="2Captcha Key" 
            value={apiKey} onChangeText={setApiKey} 
          />
          <TouchableOpacity style={styles.btn} onPress={async () => {
              await AsyncStorage.setItem('API_KEY', apiKey);
              setShowModal(false); loadSettings();
            }}>
            <Text style={styles.btnText}>Simpan</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <HeaderPanel
        backto={handleBackBtn}
        HeaderTitle={CONFIG.APP_SCREEN[2]}
        onRun={pilotRun}
        onStop={stopRun}
        isRun={isRun}
        onExport={() => exportResults(results,'Hasil_Oss')}
        exportDisabled={results.length === 0}
        hasResults={results.length > 0}
      />
      
      <View style={styles.mainContent}>
        {/* Kontrol Navigasi Tab */}
        <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />

        {/* Dynamic Display Area */}
        <View style={styles.content}>
          <View style={[styles.tabContent, activeTab !== "console" && styles.hidden]}>
            <ConsolePanel 
              pilihFile={pickExcelForOss} 
              logMsg={logs} 
              fileName={excelName}
              contentFile={`Berisi ${excelData.length} Data Nomor KPJ`}
              results={results}
              // Masukkan props progress ke ConsolePanel
              success={progress.success} 
              failed={progress.failed} 
              pending={progress.pending - progress.success - progress.failed}
              processed={progress.current}
              totalData={excelData.length}
            />
          </View>

          <View style={[styles.tabContent, activeTab !== "webview" && styles.hidden]}>
            <WebViewPanel 
              url={currentUrl} 
              webViewRef={webViewRef} 
              pesan={onMessage} 
              onLoadEnd={onPageLoadFinished}
              // Masukkan props progress ke ConsolePanel
              success={progress.success} 
              failed={progress.failed} 
              pending={progress.pending - progress.success - progress.failed}
              processed={progress.current}
              totalData={excelData.length}
            />
          </View>
        </View>

        {/* System Footer Metadata */}
        <View style={styles.systemFooter}>
          <Text style={styles.footerBrand}>{CONFIG.APP_NAME} v{CONFIG.APP_VERSION}</Text>
          <View style={styles.systemStatus}>
            <View style={[styles.statusDot, isRun && styles.statusActive]} />
            <Text style={styles.statusText}>
              {isRun ? 'RUNNING' : 'ENCRYPTED CONNECTION'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default OssScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  hidden: {
    display: "none",
  },
  bottomSection: {
    flex: 1,
    maxHeight: 250,
    marginBottom: 10,
  },
  systemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.SECONDARY,
    marginTop: 5,
  },
  footerBrand: {
    color: COLORS.TEXT_FOOTER,
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
    backgroundColor: COLORS.PRIMARY,
    marginRight: 6,
  },
  statusActive: {
    backgroundColor: COLORS.SUCCESS,
  },
  statusText: {
    color: COLORS.TEXT_FOOTER,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalView: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  btn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },

});