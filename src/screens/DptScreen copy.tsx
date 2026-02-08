// DptScreen.tsx (update bagian yang relevan)
import { View, Text, StatusBar, StyleSheet, Alert } from 'react-native'
import { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import DashboardScreen from './DashboardScreen';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

// Import komponen
import HeaderPanel from '../components/HeaderPanel';
import TabSwitcher from '../components/TabSwitcher';
import ConsolePanel from '../components/ConsolePanel';
import WebViewPanel from '../components/WebViewPanel';
import ProgressPanel from '../components/ProgressPanel';
import { WilayahService } from '../services/WilayahService';
import { ExcelRowData,AutomationResult } from '../interfaces/Automation';


const DptScreen = () => {
  // kumpulan State
  const [activeTab, setActiveTab] = useState<"console" | "webview">("console");
  const [showDashboard, setShowDashboard] = useState(false);
  // const [excelData, setExcelData] = useState<string[]>([]);
  const [excelDataLengkap, setExcelDataLengkap] = useState<ExcelRowData[]>([]);
  const [excelName, setExcelName] = useState<string>();
  const [logs, setLogs] = useState<string[]>([]);
  const isRun = useRef(false);
  const webViewRef = useRef<WebView>(null);
  const [iconRun, setIconRun] = useState(false);
  const [progress, setProgress] = useState({ success: 0, failed: 0, pending: 0, current: 0 });
  const [results, setResults] = useState<AutomationResult[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Ref untuk kontrol flow
  const automationResolver = useRef<((value?: unknown) => void) | null>(null);
  const pageLoadResolver = useRef<((value?: unknown) => void) | null>(null);
  const kecamatanCache = useRef<Map<string, string>>(new Map());
  const pageLoadRetryCount = useRef(0);
  const maxRetryAttempts = 10;

  // Tambah ref untuk timeoutId
  const pageLoadTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const automationTimeoutId = useRef<NodeJS.Timeout | null>(null);

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
const requestStoragePermission = async () => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    
    if (status === 'granted') {
      setPermissionGranted(true);
      addLog('✅ Izin penyimpanan diberikan');
      return true;
    } else {
      addLog('❌ Izin penyimpanan ditolak');
      Alert.alert(
        'Izin Diperlukan',
        'Aplikasi memerlukan izin penyimpanan untuk menyimpan hasil export.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Coba Lagi', onPress: () => requestStoragePermission() }
        ]
      );
      return false;
    }
  } catch (error) {
    console.error('Error requesting permission:', error);
    addLog('❌ Gagal meminta izin penyimpanan');
    return false;
  }
};

// Panggil fungsi request permission di useEffect
useEffect(() => {
  const checkAndRequestPermission = async () => {
    // Cek status izin saat membuka screen
    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
    } else {
      // Minta izin secara otomatis atau saat pertama kali
      // Anda bisa memilih untuk meminta sekarang atau nanti saat export
      // requestStoragePermission();
    }
  };
  
  checkAndRequestPermission();
}, []);

  // Fungsi helper untuk menunggu pesan dari WebView
const waitForPageLoad = () => {
  return new Promise((resolve, reject) => {
    pageLoadResolver.current = resolve;
    const timeoutId = setTimeout(() => {
      if (pageLoadResolver.current) {
        pageLoadRetryCount.current++;
        
        if (pageLoadRetryCount.current >= maxRetryAttempts) {
          // Reset counter
          pageLoadRetryCount.current = 0;
          reject(new Error('MAX_RETRY_EXCEEDED'));
        } else {
          // Trigger retry
          reject(new Error('PAGE_LOAD_TIMEOUT'));
        }
        pageLoadResolver.current = null;
      }
    }, 30000); // 30 detik timeout (dikurangi dari 60 detik)
    
    // Simpan timeoutId untuk dibersihkan jika berhasil
    pageLoadTimeoutId.current = timeoutId;
  });
};

  // Fungsi menunggu Script Automasi Selesai
const waitForAutomation = () => {
  return new Promise((resolve, reject) => {
    automationResolver.current = resolve;
    const timeoutId = setTimeout(() => {
      if (automationResolver.current) {
        reject(new Error('AUTOMATION_TIMEOUT'));
        automationResolver.current = null;
      }
    }, 30000); // 30 detik timeout
    
    automationTimeoutId.current = timeoutId;
  });
};


const onPageLoadFinished = () => {
  if (pageLoadTimeoutId.current) {
    clearTimeout(pageLoadTimeoutId.current);
    pageLoadTimeoutId.current = null;
  }
  
  if (pageLoadResolver.current) {
    pageLoadResolver.current();
    pageLoadResolver.current = null;
  }
  
  // Reset retry count saat page berhasil load
  pageLoadRetryCount.current = 0;
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
      const fileName = res.assets[0].name; //mengambil nama file nya
      const blob = await response.arrayBuffer();
      const wb = XLSX.read(blob, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
     // const data: any[][] = XLSX.utils.sheet_to_json(ws);
     const data = XLSX.utils.sheet_to_json(ws) as ExcelRowData[];
      
      // // Ambil data DPT - sesuaikan dengan struktur Excel Anda
      // const DptList = data.map((row: any) => {
      //   // Coba beberapa kemungkinan nama kolom
      //   return row.NIK_Number || row.NIK || row.nik || row['NIK Number'] || '';
      // }).filter(nik => nik); // Hapus yang kosong
      
      //setExcelData(DptList);
      setExcelDataLengkap(data);
      setExcelName(fileName);
      setProgress(p => ({ ...p, pending: data.length }));
      addLog(`✅ Loaded ${data.length} DPT numbers from ${fileName}`);
      
    } catch (error) {
      console.error('Error reading Excel:', error);
      Alert.alert('Error', 'Gagal membaca file Excel');
    }
  };

const pilotRun = async () => {
  if (!excelDataLengkap || excelDataLengkap.length === 0) {
    Alert.alert('Info', 'Upload data DPT terlebih dahulu');
    return;
  }

  setIconRun(true);
  isRun.current = true;
  setProgress({ success: 0, failed: 0, pending: excelDataLengkap.length, current: 0 });
  setResults([]);
  kecamatanCache.current.clear();
  
  // Reset retry counter
  pageLoadRetryCount.current = 0;
  
  addLog('🚀 Memulai Automasi...');
  addLog(`Total data: ${excelDataLengkap.length}`);

  // Initial delay
  await new Promise(r => setTimeout(r, 1000));

  for (let i = 0; i < excelDataLengkap.length; i++) {
    if (!isRun.current) {
      addLog('⏹️ Automasi dihentikan');
      break;
    }

    const dpt = excelDataLengkap[i].NIK_Number;
    setProgress(p => ({ ...p, current: i + 1 }));
    addLog(`Processing (${i + 1}/${excelDataLengkap.length}): ${dpt}`);

    try {
      // 1. RELOAD & TUNGGU SELESAI DENGAN RETRY MECHANISM
      let pageLoaded = false;
      let retryCount = 0;
      
      while (!pageLoaded && retryCount < maxRetryAttempts && isRun.current) {
        try {
          addLog(`🔄 Reloading page... (Attempt ${retryCount + 1}/${maxRetryAttempts})`);
          webViewRef.current?.reload();
          await waitForPageLoad();
          pageLoaded = true;
          addLog('✅ Halaman berhasil dimuat');
        } catch (error: any) {
          retryCount++;
          
          if (error.message === 'MAX_RETRY_EXCEEDED') {
            addLog('❌ Gagal memuat halaman setelah 10x percobaan');
            addLog('🔧 Kemungkinan masalah:');
            addLog('   1. Koneksi internet tidak stabil');
            addLog('   2. Website KPU sedang down');
            addLog('   3. Blokir oleh jaringan/firewall');
            
            Alert.alert(
              'Gagal Memuat Halaman',
              'Gagal memuat halaman setelah 10x percobaan.\n\nPeriksa:\n1. Koneksi internet Anda\n2. Coba akses https://cekdptonline.kpu.go.id/ di browser\n3. Matikan VPN jika ada\n\nLanjutkan proses setelah koneksi stabil?',
              [
                { 
                  text: 'Hentikan', 
                  onPress: () => {
                    stopRun();
                  },
                  style: 'destructive'
                },
                { 
                  text: 'Coba Lanjut', 
                  onPress: () => {
                    // Reset counter dan lanjutkan
                    pageLoadRetryCount.current = 0;
                  }
                }
              ]
            );
            
            // Tunggu konfirmasi user
            await new Promise(resolve => setTimeout(resolve, 5000));
            break;
          } else if (error.message === 'PAGE_LOAD_TIMEOUT') {
            addLog(`⏰ Timeout, mencoba lagi... (${retryCount}/${maxRetryAttempts})`);
            
            // Tunggu sebelum retry (exponential backoff)
            const waitTime = Math.min(2000 * retryCount, 10000);
            await new Promise(r => setTimeout(r, waitTime));
            
            if (retryCount === 5) {
              addLog('⚠️ Sudah 5x percobaan, cek koneksi internet!');
            }
          } else {
            addLog(`❌ Error: ${error.message}`);
            break;
          }
        }
      }
      
      // Jika gagal load setelah semua percobaan, skip data ini
      if (!pageLoaded) {
        addLog(`⏭️ Skip NIK ${dpt} - gagal load halaman`);
        setProgress(p => ({ ...p, failed: p.failed + 1 }));
        continue;
      }
      
      // 2. INJECT SCRIPT DENGAN RETRY
      let automationSuccess = false;
      let automationRetryCount = 0;
      const maxAutomationRetry = 3;
      
      while (!automationSuccess && automationRetryCount < maxAutomationRetry && isRun.current) {
        try {
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
                        KPJ : '${excelDataLengkap[i].KPJ_Number}',
                        NIK : '${dpt}',
                        Name: '${excelDataLengkap[i].Full_Name}',
                        BirthDate: '${excelDataLengkap[i].Birth_Date}',
                        Email : '',
                        kabupaten: popup.kabupaten,
                        kelurahan: popup.kelurahan,
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
              
              // Timeout untuk script
              setTimeout(() => {
                clearInterval(check);
                window.sendToRN('error', 'script_timeout');
              }, 30000);
            })();
            true;
          `;
          
          webViewRef.current?.injectJavaScript(script);
          
          // 3. TUNGGU HASIL DARI SCRIPT
          await waitForAutomation();
          automationSuccess = true;
          
        } catch (error: any) {
          automationRetryCount++;
          
          if (error.message === 'AUTOMATION_TIMEOUT') {
            addLog(`⏰ Script timeout, retry ${automationRetryCount}/${maxAutomationRetry}`);
            
            if (automationRetryCount >= maxAutomationRetry) {
              addLog(`❌ Gagal automasi untuk NIK ${dpt} setelah ${maxAutomationRetry} percobaan`);
              setProgress(p => ({ ...p, failed: p.failed + 1 }));
            } else {
              // Tunggu sebelum retry
              await new Promise(r => setTimeout(r, 2000));
            }
          } else {
            addLog(`❌ Automation error: ${error.message}`);
            setProgress(p => ({ ...p, failed: p.failed + 1 }));
            break;
          }
        }
      }
      
      // Delay antar request untuk menghindari blokir
      await new Promise(r => setTimeout(r, 500));
      
    } catch (error: any) {
      addLog(`❌ System Error: ${error.message}`);
      setProgress(p => ({ ...p, failed: p.failed + 1 }));
    }
  }
  
  isRun.current = false;
  setIconRun(false);
  addLog(`🏁 Automasi Selesai`);
  addLog(`✅ Success: ${progress.success} | ❌ Failed: ${progress.failed}`);
  
  // Reset retry counter setelah selesai
  pageLoadRetryCount.current = 0;
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

    // Clear automation timeout jika ada
    if (automationTimeoutId.current) {
      clearTimeout(automationTimeoutId.current);
      automationTimeoutId.current = null;
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
                KPJ : res.KPJ,
                NIK : res.NIK,
                Full_Name: res.Name,
                Birth_Date: res.BirthDate,
                Email: res.Email,
                kabupaten: res.kabupaten,
                kecamatan: hasilKecamatan.toLocaleUpperCase(),
                kelurahan: res.kelurahan,
                Lasik_Result: 'Berhasil'
              };
              
              setResults(prev => [...prev, newRes]);
              setProgress(p => ({ ...p, success: p.success + 1 }));
              
              addLog('=============================');
              addLog(`✅ NIK: ${res.NIK}`);
              addLog(`✅ Nama: ${res.Name}`);
              addLog(`✅ Kabupaten: ${res.kabupaten}`);
              addLog(`✅ Kelurahan: ${res.kelurahan}`);
              addLog(`✅ Kecamatan: ${hasilKecamatan.toUpperCase()}`);
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
    // Cek izin sebelum melanjutkan
    if (!permissionGranted) {
      const granted = await requestStoragePermission();
      if (!granted) {
        Alert.alert('Izin Diperlukan', 'Silakan berikan izin penyimpanan untuk melanjutkan.');
        return;
      }
    }

    // Buat worksheet
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil DPT");
    
    // Generate file
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    
    // Buat nama file dengan timestamp
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      .replace(/[/]/g, '-')
      .replace(/[:]/g, '.')
      .replace(/[ ]/g, '_');

    const fileName = `Hasil_DPT_${timestamp}.xlsx`;
    // Hasil: Hasil_DPT_27-01-2026_16.30.05.xlsx
    
    // Tentukan path penyimpanan
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    
    // Tulis file ke storage
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: 'base64',
    });

    
    // Simpan ke gallery/downloads (opsional)
    try {
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync('DPT_Results', asset, false);
      addLog(`📁 File disimpan: ${fileName}`);
    } catch (saveError) {
      // Fallback: hanya simpan di directory app
      addLog(`📁 File disimpan di directory app: ${fileName}`);
    }
    
    // Tampilkan opsi untuk share/membuka file
    if (await Sharing.isAvailableAsync()) {
      Alert.alert(
        'Export Berhasil',
        `Data berhasil diexport (${results.length} baris)`,
        [
          { text: 'Simpan File', onPress: () => Sharing.shareAsync(fileUri) },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } else {
      Alert.alert('Sukses', `Data berhasil di-export (${results.length} baris)`);
    }
    
    addLog(`📊 Data berhasil di-export (${results.length} baris)`);
    
  } catch (error) {
    console.error('Export error:', error);
    Alert.alert('Error', 'Gagal mengexport data');
    addLog(`❌ Error export: ${error}`);
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
            processed={progress.current}
            totalData={excelData.length}
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
  },
  statusText: {
    color: "#334155",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});