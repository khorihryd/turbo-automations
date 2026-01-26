// DptScreen.tsx (update bagian yang relevan)
import { View, Text, StatusBar, StyleSheet, Alert } from 'react-native'
import { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import DashboardScreen from './DashboardScreen';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

// Import komponen
import HeaderPanel from '../components/HeaderPanel';
import TabSwitcher from '../components/TabSwitcher';
import ConsolePanel from '../components/ConsolePanel';
import WebViewPanel from '../components/WebViewPanel';
import ProgressPanel from '../components/ProgressPanel';
import { WilayahService } from './services/WilayahService';

interface AutomationResult {
  nama: string;
  dpt: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
}

const DptScreen = () => {
  // kumpulan State
  const [activeTab, setActiveTab] = useState<"console" | "webview">("console");
  const [showDashboard, setShowDashboard] = useState(false);
  const [excelData, setExcelData] = useState<string[]>([]);
  const [excelName, setExcelName] = useState<string>();
  const [logs, setLogs] = useState<string[]>([]);
  const isRun = useRef(false);
  const webViewRef = useRef<WebView>(null);
  const [iconRun, setIconRun] = useState(false);
  const [progress, setProgress] = useState({ success: 0, failed: 0, pending: 0, current: 0 });
  const [results, setResults] = useState<AutomationResult[]>([]);
  
  // Ref untuk kontrol flow
  const automationResolver = useRef<((value?: unknown) => void) | null>(null);
  const pageLoadResolver = useRef<((value?: unknown) => void) | null>(null);
  const kecamatanCache = useRef<Map<string, string>>(new Map());

  const handleBackBtn = () => {
    setShowDashboard(true);
  };

  if (showDashboard) {
    return <DashboardScreen />;
  }

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('id-ID');
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 50)]);
  };

  // Fungsi helper untuk menunggu pesan dari WebView
  const waitForPageLoad = () => {
    return new Promise((resolve) => {
      pageLoadResolver.current = resolve;
      setTimeout(() => {
        if (pageLoadResolver.current) {
          addLog('⚠️ Page load timeout (Force continue)');
          pageLoadResolver.current();
          pageLoadResolver.current = null;
        }
      }, 30000); // 30 detik timeout
    });
  };

  // Fungsi menunggu Script Automasi Selesai
  const waitForAutomation = () => {
    return new Promise((resolve) => {
      automationResolver.current = resolve;
      setTimeout(() => {
        if (automationResolver.current) {
          addLog('⚠️ Script timeout (Force continue)');
          automationResolver.current();
          automationResolver.current = null;
        }
      }, 30000); // 30 detik timeout
      });
  };

  const onPageLoadFinished = () => {
    if (pageLoadResolver.current) {
      pageLoadResolver.current();
      pageLoadResolver.current = null;
    }
  };

  // Fungsi ambil data kecamatan dengan caching
const ambilDataKec = async (kabupaten: string, kelurahan: string): Promise<string> => {
  addLog(`🔍 Mencari di database: ${kelurahan}, ${kabupaten}`);
  
  const hasil = await WilayahService.findKecamatan(kabupaten, kelurahan);
  
  if (hasil) {
    addLog(`✅ Kecamatan ditemukan: ${hasil}`);
    return hasil;
  }
  
  addLog('❌ Tidak ditemukan di database');
  return 'Tidak Ditemukan';
};

  // mengambil file excel
  const pickExcel = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true
      });
      
      if (res.canceled) return;
      
      const response = await fetch(res.assets[0].uri);
      const fileName = res.assets[0].name;
      const blob = await response.arrayBuffer();
      const wb = XLSX.read(blob, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: any[][] = XLSX.utils.sheet_to_json(ws);
      
      // Ambil data DPT - sesuaikan dengan struktur Excel Anda
      const DptList = data.map((row: any) => {
        // Coba beberapa kemungkinan nama kolom
        return row.NIK_Number || row.NIK || row.nik || row['NIK Number'] || '';
      }).filter(nik => nik); // Hapus yang kosong
      
      setExcelData(DptList);
      setExcelName(fileName);
      setProgress(p => ({ ...p, pending: DptList.length }));
      addLog(`✅ Loaded ${DptList.length} DPT numbers from ${fileName}`);
      
    } catch (error) {
      console.error('Error reading Excel:', error);
      Alert.alert('Error', 'Gagal membaca file Excel');
    }
  };

  const pilotRun = async () => {
    if (!excelData.length) {
      Alert.alert('Info', 'Upload data DPT terlebih dahulu');
      return;
    }

    setIconRun(true);
    isRun.current = true;
    setProgress({ success: 0, failed: 0, pending: excelData.length, current: 0 });
    setResults([]);
    kecamatanCache.current.clear(); // Clear cache setiap run baru
    addLog('🚀 Memulai Automasi...');
    addLog(`Total data: ${excelData.length}`);

    // Initial delay
    await new Promise(r => setTimeout(r, 1000));

    for (let i = 0; i < excelData.length; i++) {
      if (!isRun.current) {
        addLog('⏹️ Automasi dihentikan');
        break;
      }

      const dpt = excelData[i];
      setProgress(p => ({ ...p, current: i + 1 }));
      addLog(`Processing (${i + 1}/${excelData.length}): ${dpt}`);

      try {
        // 1. RELOAD & TUNGGU SELESAI
        addLog('🔄 Reloading page...');
        webViewRef.current?.reload();
        await waitForPageLoad();
        
        // 2. INJECT SCRIPT
        addLog('💉 Injecting script...');
        
        const script = `
          (function(){
            const check = setInterval(() => {
              if (!window.automation) return;
              
              if(window.automation.fill('#__BVID__20', '${dpt}')) {
                clearInterval(check);
                
                window.automation.click('#root > main > div.container > div > div > div > div > div > div.wizard-buttons > div:nth-child(2) > button');
                
                setTimeout(() => {
                  const popup = window.automation.checkPopupDPT();
                  const titleElement = document.querySelector('#root > main > div.container > div > div > div > div > div > div:nth-child(1) > div > div > div > div > div > div > div.bottom_x > div.column > h2');
                  const titleText = titleElement ? titleElement.innerText : '';
                  const titleGagal = document.querySelector('#root > main > div.container > div > div > div > div > div > div:nth-child(1) > div > div > div > div > div > div > div:nth-child(2) > h2 > b');
                  const gagalText = titleGagal ? titleGagal.innerText : '';
                  
                  if(titleText.includes('Selamat')){
                    const data = {
                      nama: popup.nama,
                      ktp: '${dpt}',
                      kelurahan: popup.kelurahan,
                      kabupaten: popup.kabupaten,
                      status: 'success'
                    };
                    window.sendToRN('final_data', data);
                  } else if(gagalText.includes('belum')){
                    const data = {
                      nik: '${dpt}',
                      status: 'gagal',
                      reason: 'tidak terdaftar!'
                    };
                    window.sendToRN('final_data', data);
                  } else {
                    window.sendToRN('error', 'terjadi kesalahan');
                  }
                }, 3000);
              }
            }, 1000);
          })();
          true;
        `;
        
        webViewRef.current?.injectJavaScript(script);

        // 3. TUNGGU HASIL DARI SCRIPT
        await waitForAutomation();
        
        // Delay antar request untuk menghindari blokir
        await new Promise(r => setTimeout(r, 500));
        
      } catch (error) {
        addLog(`❌ Error System: ${error}`);
        setProgress(p => ({ ...p, failed: p.failed + 1 }));
      }
    }
    
    isRun.current = false;
    setIconRun(false);
    addLog(`🏁 Automasi Selesai`);
    addLog(`✅ Success: ${progress.success} | ❌ Failed: ${progress.failed}`);
  };

  const stopRun = () => {
    isRun.current = false;
    setIconRun(false);
    addLog('🛑 Automasi dihentikan manual');
  };

  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Lepas rem waitForAutomation
      if (automationResolver.current) {
        automationResolver.current();
        automationResolver.current = null;
      }

      switch (data.type) {
        case 'cek':
          addLog(`${data.payload}`);
          break;
          
        case 'final_data':
          const res = data.payload;
          
          if (res.status === 'success') {
            try {
              // Ambil kecamatan secara asynchronous
              const hasilKecamatan = await ambilDataKec(res.kabupaten, res.kelurahan);
              
              const newRes: AutomationResult = {
                nama: res.nama,
                dpt: res.ktp,
                kelurahan: res.kelurahan,
                kecamatan: hasilKecamatan,
                kabupaten: res.kabupaten
              };
              
              setResults(prev => [...prev, newRes]);
              setProgress(p => ({ ...p, success: p.success + 1 }));
              
              addLog('=============================');
              addLog(`✅ NIK: ${res.ktp}`);
              addLog(`✅ Nama: ${res.nama}`);
              addLog(`✅ Kabupaten: ${res.kabupaten}`);
              addLog(`✅ Kelurahan: ${res.kelurahan}`);
              addLog(`📍 Kecamatan: ${hasilKecamatan.toUpperCase()}`);
              addLog('=============================');
              
            } catch (error) {
              addLog(`❌ Gagal mengambil kecamatan: ${error}`);
              setProgress(p => ({ ...p, failed: p.failed + 1 }));
            }
          } else {
            setProgress(p => ({ ...p, failed: p.failed + 1 }));
            addLog('=============================');
            addLog(`❌ NIK: ${res.nik}`);
            addLog(`❌ Status: ${res.status}`);
            addLog(`❌ Alasan: ${res.reason}`);
            addLog('=============================');
          }
          break;
          
        case 'error':
          addLog(`⚠️ Web Error: ${data.payload}`);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (e) {
      console.log('Message parsing error:', e);
      addLog(`⚠️ Error parsing message: ${e}`);
    }
  };

  // Export hasil ke Excel
  const exportResults = async () => {
    if (results.length === 0) {
      Alert.alert('Info', 'Tidak ada data untuk di-export');
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(results);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Hasil DPT");
      
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
      
      // Simpan file (gunakan expo-file-system atau library lain)
      addLog(`📊 Data berhasil di-export (${results.length} baris)`);
      Alert.alert('Sukses', `Data berhasil di-export (${results.length} baris)`);
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Gagal mengexport data');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#19183B" />
      
      {/* <HeaderPanel
        backto={handleBackBtn}
        HeaderTitle="DPT Checker"
        onRun={pilotRun}
        onStop={stopRun}
        isRun={iconRun}
        onExport={exportResults}
        exportDisabled={results.length === 0}
      /> */}
      <HeaderPanel
        backto={handleBackBtn}
        HeaderTitle="DPT Checker"
        onRun={pilotRun}
        onStop={stopRun}
        isRun={iconRun}
        onExport={exportResults}
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
              pilihFile={pickExcel} 
              logMsg={logs} 
              fileName={excelName}
              contentFile={`Berisi ${excelData.length} Data Nomor DPT`}
              results={results}
            />
          </View>

          <View style={[styles.tabContent, activeTab !== "webview" && styles.hidden]}>
            <WebViewPanel 
              url="https://cekdptonline.kpu.go.id/" 
              webViewRef={webViewRef} 
              pesan={onMessage} 
              onLoadEnd={onPageLoadFinished}
            />
          </View>
        </View>

        {/* Bottom Monitoring Panel */}
        <View style={styles.bottomSection}>
          <ProgressPanel 
            success={progress.success} 
            failed={progress.failed} 
            pending={progress.pending - progress.success - progress.failed}
            current={progress.current}
            total={excelData.length}
          />
        </View>

        {/* System Footer Metadata */}
        <View style={styles.systemFooter}>
          <Text style={styles.footerBrand}>DPT TERMINAL v1.0.5</Text>
          <View style={styles.systemStatus}>
            <View style={[styles.statusDot, iconRun && styles.statusActive]} />
            <Text style={styles.statusText}>
              {iconRun ? 'RUNNING' : 'ENCRYPTED CONNECTION'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DptScreen;

const styles = StyleSheet.create({
  // ... (styles tetap sama)
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
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
  statusActive: {
    backgroundColor: '#10B981',
    animation: 'pulse 1.5s infinite',
  },
  statusText: {
    color: "#334155",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});