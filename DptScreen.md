import { View, Text, StatusBar, StyleSheet, Alert } from 'react-native'
import { useState,useRef, useEffect } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import DashboardScreen from './DashboardScreen';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

//import komponen
import HeaderPanel from '../components/HeaderPanel';
import TabSwitcher from '../components/TabSwitcher';
import ConsolePanel from '../components/ConsolePanel';
import WebViewPanel from '../components/WebViewPanel';
import ProgressPanel from '../components/ProgressPanel';
import { getKecamatanByKabupatenAndKelurahan } from '../utils/alamatService';


interface AutomationResult {
  nama : string;
  dpt: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
}

const DptScreen = () => {
// kumpulan State
    const [activeTab, setActiveTab] = useState<"console" | "webview">("console");
    const [showDashboard,setShowDashboard] = useState(false);
    const [excelData, setExcelData] = useState<string[]>([]);
    const [excelName,setExcelName] = useState<string>();
    const [logs, setLogs] = useState<string[]>([]);
    const isRun = useRef(false)
    const webViewRef = useRef<WebView>(null);
    const [iconRun,setIconRun] = useState(false);
    const [progress, setProgress] = useState({ success: 1, failed: 0, pending: 0});
    const [results, setResults] = useState<AutomationResult[]>([]);
    // --- BAGIAN BARU (Ref untuk kontrol flow) ---
    const automationResolver = useRef<((value?: unknown) => void) | null>(null); // Pengganti promiseResolver lama
    const pageLoadResolver = useRef<((value?: unknown) => void) | null>(null);   // Khusus untuk loading page

  

    //kumpulan fungsi
    const handleBackBtn = ()=>{
      setShowDashboard(true)
    }

    if (showDashboard){
        return <DashboardScreen />
    }

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('id-ID');
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 50)]);
  };

// Fungsi helper untuk menunggu pesan dari WebView
const waitForPageLoad = () => {
  return new Promise((resolve) => {
    pageLoadResolver.current = resolve;
    // Safety timeout: kalau internet macet total, paksa lanjut setelah 30 detik
    setTimeout(() => {
      if (pageLoadResolver.current) {
        addLog('⚠️ Page load timeout (Force continue)');
        pageLoadResolver.current();
        pageLoadResolver.current = null;
      }
    }, 300000);
  });
};

// 2. Fungsi menunggu Script Automasi Selesai (Maksimal 30 detik)
const waitForAutomation = () => {
  return new Promise((resolve) => {
    automationResolver.current = resolve;
    setTimeout(() => {
        if (automationResolver.current) {
          addLog('⚠️ Script timeout (Force continue)');
          automationResolver.current();
          automationResolver.current = null;
        }
      }, 300000);
  });
};

const onPageLoadFinished = () => {
  // Jika loop sedang menunggu halaman load, lepaskan 'rem'-nya
  if (pageLoadResolver.current) {
    // console.log("Page Loaded -> Resume Loop"); // Debugging
    pageLoadResolver.current();
    pageLoadResolver.current = null;
  }
};

const ambilDataKec = (kabupaten,kelurahan) => {
   const kec = getKecamatanByKabupatenAndKelurahan(kabupaten, kelurahan);
   return kec
};

// mengambil file excel
  const pickExcel = async ()=>{
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type:['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true
      })
      if (res.canceled) return;
      const response = await fetch(res.assets[0].uri); //Ambil file dari URI
      const fileName = res.assets[0].name;
      const blob = await response.arrayBuffer(); //Ubah file jadi ArrayBuffer
      const wb = XLSX.read(blob,{type:'array'}); //Membaca file Excel
      const ws = wb.Sheets[wb.SheetNames[0]]; //Ambil sheet pertama
      const data:any[][] = XLSX.utils.sheet_to_json(ws); //Ubah sheet jadi array
      const DptList = data.map((row: any)=> row.NIK_Number);
      setExcelData(DptList);
      setExcelName(fileName);
      addLog(`Loaded ${DptList.length} DPT numbers`);
      //addLog(`${DptList}`)
    }catch(error){
        Alert.alert('Error', 'Gagal membaca Excel'); 
    }
  }

const pilotRun = async () => {
  if (!excelData.length) return Alert.alert('Info', 'Upload data dulu');

  setIconRun(true);
  isRun.current = true;
  setProgress({ success: 0, failed: 0, pending: 0 });
  addLog('🚀 Memulai Automasi...');
  
  // Initial delay kecil
  await new Promise(r => setTimeout(r, 1000)); 

  for (let i = 0; i < excelData.length; i++) {
    if (!isRun.current) break; // Tombol stop ditekan

    const dpt = excelData[i];
    setProgress(p => ({ ...p, current: i + 1 }));
    addLog(`Processing (${i + 1}/${excelData.length}): ${dpt}`);

    try {
      // 1. RELOAD & TUNGGU SELESAI
      addLog('🔄 Reloading...'); 
      webViewRef.current?.reload();
      
      // DISINI PERUBAHANNYA: Loop berhenti sampai onPageLoadFinished terpanggil
      await waitForPageLoad(); 
      
      // 2. INJECT SCRIPT
       addLog('Injecting script...');
      
      // Script kita sederhanakan, logika utamanya tetap sama tapi lebih aman
      // Pastikan menggunakan window.sendToRN agar waitForAutomation merespon
      const script = `
        (function(){
          const check = setInterval(()=>{
            // Cek apakah window.automation sudah siap
            if (!window.automation) return;

            if(window.automation.fill('#__BVID__20','${dpt}')) {
              clearInterval(check);
              
              window.automation.click('#root > main > div.container > div > div > div > div > div > div.wizard-buttons > div:nth-child(2) > button');
              
              setTimeout(() => {
                // Perbaiki selector popup agar lebih aman (gunakan optional chaining ?.)
                const popup = window.automation.checkPopupDPT(); // Gunakan fungsi helper yg sudah ada di helperFunction.tsx
                
                // Pastikan logic pengecekan popup benar
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
                    status:'gagal',
                    reason:'tidak terdaftar!'
                  }
                  // Cek apakah ada pesan error spesifik di web
                  window.sendToRN('final_data', data);
                }else{
                  window.sendToRN('error', 'terjadi kesalahan');
                }
              }, 3000); // Waktu tunggu animasi popup muncul
              
            } 
          }, 1000);
        })();
        true;
      `;
      
      webViewRef.current?.injectJavaScript(script);

      // 3. TUNGGU HASIL DARI SCRIPT
      // Loop berhenti disini sampai onMessage menerima 'final_data' atau 'error'
      await waitForAutomation();

    } catch (error) {
      addLog(`Error System: ${error}`);
    }
  }
  
  setIsRun(false);
  setIconRun(false);
  addLog(`🏁 Automasi Selesai`);
};
  const setIsRun = (status: boolean) => { isRun.current = status; };

  const onMessage = (event: WebViewMessageEvent) => {
    try{
      const data = JSON.parse(event.nativeEvent.data);
    // --- TAMBAHAN BARU: Lepas rem waitForAutomation ---
    if (automationResolver.current) {
      automationResolver.current();
      automationResolver.current = null;
    }
    // --------------------------------------------------

       switch (data.type) {
        case 'cek':
          addLog(`${data.payload}`);
          break;
        case 'final_data':
          const res = data.payload;
          if ((window as any).resolveResult) (window as any).resolveResult();

          // KODE BARU START
          

          // KODE BARU END

          if (res.status === 'success') {
              const hasilKecamatan = ambilDataKec(res.kabupaten, res.kelurahan);
              const newRes: AutomationResult = {
                nama : res.nama,
                dpt: res.ktp,
                kelurahan: res.kelurahan,
                kecamatan: hasilKecamatan,
                kabupaten: res.kabupaten
              };
              setResults(prev => [...prev, newRes]);
              setProgress(p => ({ ...p, success: p.success + 1 }));
              addLog('=============================');
              addLog(`✅ Kabupaten: ${res.kabupaten}`);
              addLog(`✅ Kecamatan: ${res.kabupaten}`);
              addLog(`✅ Kelurahan: ${res.kelurahan}`);
              addLog(`✅ NIK: ${res.ktp}`);
              addLog(`✅ Nama Lengkap: ${res.nama}`);
              addLog('=============================');
          } else {
            setProgress(p => ({ ...p, failed: p.failed + 1 }));
            addLog('=============================');
            addLog(`❌ alasan: ${res.reason}`);
            addLog(`❌ status: ${res.status}`);
            addLog(`❌ NIK: ${res.nik}`);
            addLog('=============================');
          }
          break;
          
        case 'error':
          addLog(`⚠️ Web: ${data.payload}`);
          break;
       }
       
    }catch (e) { console.log('Msg Error', e); }
  }

    
  return (
    <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#19183B" />
        <HeaderPanel
            backto={handleBackBtn} 
            HeaderTitle="DPT Checker"
            onRun={pilotRun}
            isRun={iconRun}
            />
      <View style={styles.mainContent}>
        {/* Kontrol Navigasi Tab */}
        <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />

        {/* Dynamic Display Area */}
        <View style={styles.content}>
        <View
          style={[
            styles.tabContent,
            activeTab !== "console" && styles.hidden
          ]}
        >
          <ConsolePanel pilihFile={pickExcel} logMsg={logs} fileName={excelName} contentFile={`Berisi ${excelData.length} Data Nomor DPT`}/>
        </View>

        <View
          style={[
            styles.tabContent,
            activeTab !== "webview" && styles.hidden
          ]}
        >
          <WebViewPanel url="https://cekdptonline.kpu.go.id/" webViewRef={webViewRef} pesan={onMessage} onLoadEnd={onPageLoadFinished}/>
        </View>
      </View>

        {/* Bottom Monitoring Panel */}
        <View style={styles.bottomSection}>
          <ProgressPanel success={progress.success} failed={progress.failed} pending={progress.pending}/>
        </View>

        {/* System Footer Metadata */}
        <View style={styles.systemFooter}>
          <Text style={styles.footerBrand}>DPT TERMINAL v1.0.4</Text>
          <View style={styles.systemStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>ENCRYPTED CONNECTION</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default DptScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
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