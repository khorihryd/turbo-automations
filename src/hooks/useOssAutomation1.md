import 'react-native-url-polyfill/auto';
import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { AutomationResult } from '../interfaces/Automation';
import { CONFIG } from '../constants/Config';
import { CaptchaService } from '../services/CaptchaService';


export const useOssAutomation = (
  excelData: any[][],
  webViewRef: React.RefObject<WebView | null>,
  addLog: (msg: string) => void,
  apiKey:string
) => {
  const [isRun, setIsRun] = useState(false);
  const [progress, setProgress] = useState({ success: 0, failed: 0, pending: 0, current: 0 });
  const [results, setResults] = useState<AutomationResult[]>([]);
  const [currentUrl, setCurrentUrl] = useState(CONFIG.TARGET_URL_OSS1);

  const isRunRef = useRef(false);
  const automationResolver = useRef<((value?: any) => void) | null>(null);
  const pageLoadResolver = useRef<((value?: any) => void) | null>(null);
  const pageLoadTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const automationTimeoutId = useRef<NodeJS.Timeout | null>(null);


  const MAX_RETRY_ATTEMPTS = 10;
  // --- Helpers ---
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

  const stopRun = () => {
    isRunRef.current = false;
    setIsRun(false);
    addLog('🛑 Automasi dihentikan');
  };

  // --- Main Logic ---
  const pilotRun = async () => {
    if (!excelData || excelData.length === 0) {
      Alert.alert('Info', 'Upload data KPJ terlebih dahulu');
      return;
    }
    if (!apiKey) return Alert.alert('Info', 'API Key kosong');

    setIsRun(true);
    isRunRef.current = true;
    addLog('🚀 Memulai Automasi...');
    const service = new CaptchaService(apiKey);

    // Inisialisasi Sesi
    setCurrentUrl(CONFIG.TARGET_URL_OSS1);
    await new Promise(r => setTimeout(r, 5000));
    setCurrentUrl(CONFIG.TARGET_URL_OSS2);
    await new Promise(r => setTimeout(r, 7000));

    for (let i = 0; i < excelData.length; i++) {
      if (!isRunRef.current) break;

      const row = excelData[i]; // Asumsi kolom pertama adalah data KPJ
      setProgress(p => ({ ...p, current: i + 1, pending: excelData.length - (i + 1) }));


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
        addLog(`🧐 Memproses: ${row}`);

        // Injeksi Script Pertama: Isi Form & Ambil Captcha
        const initialScript = `
          (function(){
            try {
            const maxAttempts = 0;
              const waitingBtn = setInterval(()=>{
                if(window.automation.click('#collapse_sudah')) {
                  clearInterval(waitingBtn);
                  setTimeout(() => {
                    window.automation.fill('#kpj', '${row}');
                    const img = window.automation.getCaptcha('#img_captcha_kpj');
                    if(img) {
                      window.sendToRN('solve_captcha', img);
                    } else {
                      window.sendToRN('error', 'Gagal mengambil gambar captcha');
                    }
                  }, 1500);
                }
                if (maxAttempts > 10 ){
                clearInterval(waitingBtn)
                window.sendToRN('error', 'Accordion #collapse_sudah tidak ditemukan');
                }else{
                  maxAttempts++;
                  }
              },5000)
              
            } catch(e) { window.sendToRN('error', e.message); }
          })();
          true;
        `;
        webViewRef.current?.injectJavaScript(initialScript);

        // --- STEP B: Tunggu Gambar Captcha ---
        const captchaResult = await new Promise<string | null>((resolve) => {
          const timeout = setTimeout(() => resolve(null), 15000);
          (window as any).resolveCaptcha = (val: string | null) => {
            clearTimeout(timeout);
            resolve(val);
          };
        });

        if (!captchaResult) throw new Error('Captcha tidak ditemukan/Timeout');

        // --- STEP C: Solve Captcha ---
        addLog('🧩 Solving Captcha...');
        const code = await service.solve(captchaResult);
        addLog(`🔑 Solved: ${code}`);

        // --- STEP D: Submit & Cek Hasil ---
        webViewRef.current?.injectJavaScript(`
          (function() {
            window.automation.fill('#captcha_kpj', '${code}');
            
            // Klik tombol cek / Jalankan fungsi
            if(typeof cekStatusKpj === 'function') {
               cekStatusKpj();
            } else {
               // Fallback kalau function tidak ada, cari tombol submit
               const btn = document.querySelector('button[type="submit"]'); // Sesuaikan selector
               if(btn) btn.click();
            }

            // Polling hasil (SweetAlert)
            let attempts = 0;
            const check = setInterval(() => {
               attempts++;
               const popup = window.automation.checkPopup();
               
               // KASUS: BERHASIL
               if(popup.title && (popup.title.includes('Berhasil')) {
                 clearInterval(check);
                 // Klik Lanjut/OK
                 const btn = document.querySelector('button.swal2-confirm');
                 if(btn) btn.click();
                 
                  setTimeout(()=>{
                    const popup = window.automation.checkPopupLasik();
                    if(popup.title.includes('Konfirmasi') || popup.content.includes('Pengajuan Klaim')){
                      window.sendToRN('final_data', {
                          KPJ: '${row}',
                          NIK: window.automation.getText('#no_identitas'),
                          Name: popup.content,
                          BirthDate: window.automation.getText('#tgl_lahir'),
                          Lasik_Result: '',
                          status: 'success'
                        });
                    }else{
                      window.sendToRN('final_data', { kpj: '${row}', status: 'gagal' });  
                    }
                  },3000)
               } 
               // KASUS: GAGAL
               else if(popup.title && (popup.title.includes('KPJ tidak terdaftar'))) {
                 clearInterval(check);
                 window.sendToRN('final_data', { status: 'failed', reason: popup.title });
                 // Tutup popup
                 const btn = document.querySelector('button.swal2-confirm');
                 if(btn) btn.click();
                 break;
               }else{
                const btn = document.querySelector('button.swal2-confirm');
                 if(btn) btn.click();
                }

               // TIMEOUT (10 detik)
               if(attempts > 20) {
                 clearInterval(check);
                 window.sendToRN('error', 'Timeout menunggu popup hasil');
               }
            }, 1000);
          })();
          true;
        `);
        // Tunggu sampai onMessage menerima 'final_data' atau 'error'
        await waitForAutomation(); 
        
      } catch (error) {
        addLog(`❌ Error Sistem pada baris ${i + 1}`);
      }
    }
    stopRun();
  };

  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'solve_captcha':
          if ((window as any).resolveCaptcha) (window as any).resolveCaptcha(data.payload);
          break;
          
        case 'final_data':
          const res = data.payload;
          if ((window as any).resolveResult) (window as any).resolveResult();

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
              Lasik_Result: ''
            };
            setResults(prev => [...prev, newResult]);
            setProgress(p => ({ ...p, success: p.success + 1 }));
            addLog(`✅ Berhasil: ${res.Name}`);
          } else {
            setProgress(p => ({ ...p, failed: p.failed + 1 }));
            addLog(`❌ Gagal: ${res.reason}`);
          }
          break;

        case 'error':
          addLog(`⚠️ Web: ${data.payload}`);
          if ((window as any).resolveCaptcha) (window as any).resolveCaptcha(null); // Lepas await
          if ((window as any).resolveResult) (window as any).resolveResult(); // Lepas await
          break;
      }
    } catch (e) { console.log('Msg Error', e); }
  };

  return { isRun, progress, results, currentUrl, pilotRun, stopRun, onMessage, onPageLoadFinished: () => pageLoadResolver.current?.() };
};