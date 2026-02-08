import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { ExcelRowData, AutomationResult } from '../interfaces/Automation';

export const useLasikAutomation = (
  excelDataLengkap: ExcelRowData[],
  webViewRef: React.RefObject<WebView | null>,
  addLog: (msg: string) => void
) => {
  // State Monitoring
  const [isRun, setIsRun] = useState(false);
  const [progress, setProgress] = useState({ success: 0, failed: 0, pending: 0, current: 0 });
  const [results, setResults] = useState<AutomationResult[]>([]);
  
  // Ref untuk kontrol flow (Internal)
  const isRunRef = useRef(false);
  const automationResolver = useRef<((value?: unknown) => void) | null>(null);
  const pageLoadResolver = useRef<((value?: unknown) => void) | null>(null);
  const pageLoadTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const automationTimeoutId = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const MAX_RETRY_ATTEMPTS = 10;

  // --- Helper Functions ---

  const waitForPageLoad = () => {
    return new Promise((resolve, reject) => {
      pageLoadResolver.current = resolve;
      pageLoadTimeoutId.current = setTimeout(() => {
        if (pageLoadResolver.current) {
          reject(new Error('PAGE_LOAD_TIMEOUT'));
          pageLoadResolver.current = null;
        }
      }, 30000);
    });
  };

  const waitForAutomation = () => {
    return new Promise((resolve, reject) => {
      automationResolver.current = resolve;
      automationTimeoutId.current = setTimeout(() => {
        if (automationResolver.current) {
          reject(new Error('AUTOMATION_TIMEOUT'));
          automationResolver.current = null;
        }
      }, 30000);
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
  };

  const stopRun = () => {
    isRunRef.current = false;
    setIsRun(false);
    addLog('🛑 Automasi dihentikan manual');
  };

  // --- Main Logic ---

  const pilotRun = async () => {
    if (!excelDataLengkap || excelDataLengkap.length === 0) {
      Alert.alert('Info', 'Upload data KPJ terlebih dahulu');
      return;
    }

    setIsRun(true);
    isRunRef.current = true;
    setProgress({ success: 0, failed: 0, pending: excelDataLengkap.length, current: 0 });
    setResults([]);
    
    addLog('🚀 Memulai Automasi...');

    for (let i = 0; i < excelDataLengkap.length; i++) {
      if (!isRunRef.current) break;

      const row = excelDataLengkap[i];
      setProgress(p => ({ ...p, current: i + 1 }));
      addLog(`Processing (${i + 1}/${excelDataLengkap.length}): ${row.NIK_Number}`);

      try {
        // 1. Reload Page with Retry
        let pageLoaded = false;
        let retryCount = 0;
        
        while (!pageLoaded && retryCount < MAX_RETRY_ATTEMPTS && isRunRef.current) {
          try {
            webViewRef.current?.reload();
            await waitForPageLoad();
            pageLoaded = true;
          } catch (err) {
            retryCount++;
            addLog(`⏰ Timeout, retry ${retryCount}...`);
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (!pageLoaded) continue;

        // 2. Inject Script
        const script = `
          (function(){
            const check = setInterval(()=>{
              if (!window.automation) return;
              if (window.automation.click('#btn-close-popup-banner')){
              clearInterval(check);
                window.automation.fill('#regForm > div:nth-child(2) > div > div > div:nth-child(1) > input','${row.NIK_Number}');
                window.automation.fill('#regForm > div:nth-child(2) > div > div > div:nth-child(2) > input','${row.KPJ_Number}');
                window.automation.fill('#regForm > div:nth-child(2) > div > div > div:nth-child(3) > input','${row.Full_Name}');
              setTimeout(()=>{
                const popup = window.automation.checkPopupLasik();
                if(popup.title.includes('Konfirmasi') || popup.content.includes('Pengajuan Klaim')){
                  window.sendToRN('final_data', {
                      KPJ: '${row.KPJ_Number}',
                      NIK: '${row.NIK_Number}',
                      Name: '${row.Full_Name}',
                      BirthDate: '${row.Birth_Date}',
                      Lasik_Result: 'Non Aktif',
                      status: 'success'
                    });
                }else{
                  window.sendToRN('final_data', { nik: '${row.NIK_Number}', status: 'gagal' });  
                }
              },3000)
              }
            },1000);
          })();
        true;
        `;
        
        webViewRef.current?.injectJavaScript(script);
        await waitForAutomation();
        
      } catch (error) {
        addLog(`❌ Error pada NIK ${row.NIK_Number}`);
      }
    }
    
    stopRun();
    addLog('🏁 Automasi Selesai');
  };

  // --- Message Handler ---

  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (automationResolver.current) {
        automationResolver.current();
        automationResolver.current = null;
      }

      if (automationTimeoutId.current) {
        clearTimeout(automationTimeoutId.current);
        automationTimeoutId.current = null;
      }

      if (data.type === 'final_data') {
        const res = data.payload;
        if (res.status === 'success') {
          const newResult: AutomationResult = {
            KPJ_Number: res.KPJ,
            NIK_Number: res.NIK,
            Full_Name: res.Name,
            Birth_Date: res.BirthDate,
            Email: '',
            kabupaten: '',
            kecamatan: '',
            kelurahan: '',
            Lasik_Result: res.Lasik_Result
          };
          setResults(prev => [...prev, newResult]);
          setProgress(p => ({ ...p, success: p.success + 1 }));
          addLog(`✅ Berhasil: ${res.Name}`);
        } else {
          setProgress(p => ({ ...p, failed: p.failed + 1 }));
          addLog(`❌ Gagal: ${res.NIK_Number}`);
        }
      }
    } catch (e) {
      addLog('⚠️ Error parsing message');
    }
  };

  return {
    isRun,
    progress,
    results,
    pilotRun,
    stopRun,
    onMessage,
    onPageLoadFinished
  };
};