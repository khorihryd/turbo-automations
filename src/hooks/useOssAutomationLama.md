import 'react-native-url-polyfill/auto';
import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { AutomationResult } from '../interfaces/Automation';
import { CONFIG } from '../constants/Config';
import { CaptchaService } from '../services/CaptchaService'; // Kembali menggunakan ini

export const useOssAutomation = (
  excelData: any[][],
  webViewRef: React.RefObject<WebView | null>,
  addLog: (msg: string) => void,
  apiKey: string // API Key 2Captcha
) => {
  const [isRun, setIsRun] = useState(false);
  const [progress, setProgress] = useState({ success: 0, failed: 0, pending: 0, current: 0 });
  const [results, setResults] = useState<AutomationResult[]>([]);
  const [currentUrl, setCurrentUrl] = useState(CONFIG.TARGET_URL_OSS1);
  const [balance, setBalance] = useState<string>('Checking...');

  const isRunRef = useRef(false);
  
  // Resolver untuk komunikasi async dengan WebView
  const automationResolver = useRef<((value?: any) => void) | null>(null);
  const captchaResolver = useRef<((value?: string | null) => void) | null>(null);
  
  const pageLoadResolver = useRef<((value?: any) => void) | null>(null);
  const pageLoadTimeoutId = useRef<NodeJS.Timeout | null>(null);

  const MAX_RETRY_ATTEMPTS = 10; // Retry reload halaman
  const MAX_CAPTCHA_RETRIES = 3; // Retry menebak captcha

  useEffect(()=>{
    checkBalance(apiKey)
  },[balance])

  const checkBalance = async (key: string) => {
    const service = new CaptchaService(key);
    const bal = await service.getBalance();
    setBalance(bal);
  };

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

  const waitForResult = () => {
    return new Promise<any>((resolve) => {
      automationResolver.current = resolve;
      setTimeout(() => {
        if (automationResolver.current) {
          resolve({ status: 'timeout', reason: 'System Timeout waiting for popup' });
          automationResolver.current = null;
        }
      }, 60000); // 2Captcha mungkin butuh waktu lebih lama, timeout diperpanjang
    });
  };

  const waitForCaptchaImage = () => {
    return new Promise<string | null>((resolve) => {
      captchaResolver.current = resolve;
      setTimeout(() => {
        if (captchaResolver.current) {
          resolve(null);
          captchaResolver.current = null;
        }
      }, 15000);
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
    if (!apiKey) return Alert.alert('Info', 'API Key 2Captcha kosong');
    addLog(balance)

    setIsRun(true);
    isRunRef.current = true;
    addLog('🚀 Memulai Automasi (2Captcha + 3x Retry)...');
    
    // Inisialisasi Service 2Captcha
    const service = new CaptchaService(apiKey);

    // Inisialisasi Sesi Halaman
    setCurrentUrl(CONFIG.TARGET_URL_OSS1);
    await new Promise(r => setTimeout(r, 5000));
    setCurrentUrl(CONFIG.TARGET_URL_OSS2);
    await new Promise(r => setTimeout(r, 7000));

    // LOOP DATA
    for (let i = 0; i < excelData.length; i++) {
      if (!isRunRef.current) break;

      const row = excelData[i];
      setProgress(p => ({ ...p, current: i + 1, pending: excelData.length - (i + 1) }));

      try {
        // 1. Logic Reload Halaman (Agar fresh tiap data)
        let pageLoaded = false;
        let retryCount = 0;
        
        while (!pageLoaded && retryCount < MAX_RETRY_ATTEMPTS && isRunRef.current) {
          try {
            webViewRef.current?.reload();
            await waitForPageLoad();
            pageLoaded = true;
          } catch (err) {
            retryCount++;
            addLog(`⏰ Page Timeout, retry ${retryCount}...`);
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (!pageLoaded) continue;
        addLog(`🧐 Memproses: ${row}`);

        // --- LOOP COBA CAPTCHA (MAX 3 KALI) ---
        let captchaAttempts = 0;
        let isRowSolved = false;
        let finalRowResult: any = { status: 'failed', reason: 'Max Retries' };

        while (captchaAttempts < MAX_CAPTCHA_RETRIES && !isRowSolved && isRunRef.current) {
          captchaAttempts++;
          if (captchaAttempts > 1) addLog(`🔄 Retry Captcha ke-${captchaAttempts}...`);

          // A. INJEKSI SCRIPT: AMBIL GAMBAR
          const injectionScript = `
            (function(){
              try {
                // Helper tutup popup error (jika retry)
                const closeErrorPopup = () => {
                   const btn = document.querySelector('button.swal2-confirm');
                   if(btn) btn.click();
                };

                // Jika retry, tutup popup error sebelumnya dulu
                if(${captchaAttempts} > 1) { 
                   closeErrorPopup(); 
                }

                const processStart = () => {
                    if(window.automation.click('#collapse_sudah')) {
                        setTimeout(() => {
                           window.automation.fill('#kpj', '${row}');
                           
                           // Menggunakan getCaptcha standar (biasanya cukup untuk 2Captcha)
                           // atau gunakan getCleanImageForAI jika ingin gambar lebih bersih
                           const imgBase64 = window.automation.getCaptcha('#img_captcha_kpj');
                           
                           if(imgBase64) {
                             window.sendToRN('solve_captcha', imgBase64);
                           } else {
                             window.sendToRN('error', 'Gagal grab image');
                           }
                        }, 1500); 
                    } else {
                       setTimeout(processStart, 1000); 
                    }
                };
                
                setTimeout(processStart, ${captchaAttempts > 1 ? 1500 : 1000});

              } catch(e) { window.sendToRN('error', e.message); }
            })();
            true;
          `;
          
          webViewRef.current?.injectJavaScript(injectionScript);

          // B. TUNGGU GAMBAR
          const captchaBase64 = await waitForCaptchaImage();
          if (!captchaBase64) {
            addLog('⚠️ Gagal mendapatkan gambar, skip retry ini.');
            continue; 
          }

          // C. SOLVE DENGAN 2CAPTCHA
          addLog(`🧩 Sending to 2Captcha (${captchaAttempts}/${MAX_CAPTCHA_RETRIES})...`);
          let code = '';
          try {
            // Mengirim base64 ke service 2Captcha
            code = await service.solve(captchaBase64);
            addLog(`🔑 Solved: ${code}`);
          } catch (e: any) {
            addLog(`⚠️ 2Captcha Failed: ${e.message}`);
            // Jika 2Captcha error (misal overload), kita coba lagi loop berikutnya
            continue;
          }

          // D. SUBMIT & TUNGGU HASIL
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                window.sendToRN('error', '🖱️ Mencoba Submit Data...');
                
                // 1. ISI CAPTCHA
                window.automation.fill('#captcha_kpj', '${code}');
                
                // 2. KLIK TOMBOL SUBMIT (Lebih Robust)      
                if(typeof cekStatusKpj === 'function') {
                   window.sendToRN('error', '👉 Menggunakan fungsi cekStatusKpj()');
                   cekStatusKpj();
                } else {
                   throw new Error("Tombol Submit tidak ditemukan");
                }

                // 3. POLLING POPUP HASIL (Diperpanjang durasinya)
                setTimeout(()=>{
                   const popup = window.automation.checkPopupOss();
                   
                   const title = popup.title.toLowerCase();
                   const content = popup.content.toLowerCase();

                   // --- KONDISI SUKSES ---
                   if(title.includes('berhasil')) {
                      const finalName = content;

                    let checks = 0;
                    const maxChecks = 100; // Naikkan ke 60 detik (agar tidak timeout duluan sebelum RN)
                      
                      // Klik OK pada popup
                      const btnConfirm = document.querySelector('button.swal2-confirm');
                      if(btnConfirm) btnConfirm.click();

                      // Jeda sejenak sebelum kirim data final (Fix sebelumnya)
                      const cekPopup = setInterval(() => {
                          const modalPop = document.querySelector('div.swal2-container');
                          if(modalPop){
                            clearInterval(cekPopup)
                            modalPop.click();

                            window.sendToRN('final_data', {
                                KPJ: '${row}',
                                NIK: window.automation.getText('#no_identitas'),
                                Name: finalName,
                                BirthDate: window.automation.getText('#tgl_lahir'),
                                status: 'success'
                            });
                          }else if(checks >= maxChecks) {
                                clearInterval(cekPopup);
                                // Kirim pesan timeout eksplisit agar RN tidak menunggu sampai mati
                                window.sendToRN('final_data', { status: 'timeout', reason: 'Web: Tidak ada popup muncul setelah 60 detik' });
                            }
                      }, 1000);
                   }
                   // --- KONDISI GAGAL ---
                   else if(title.includes('gagal')) {
                      window.sendToRN('final_data', { 
                          status: 'failed', 
                          reason: title + " " + content,
                          isCaptchaError: (title.includes('captcha') || content.includes('captcha') || content.includes('salah')) 
                      });
                   }else{
                        window.sendToRN('final_data', { status: 'timeout', reason: 'Web: Tidak ada popup muncul setelah 60 detik' });
                   }
                },1000)
              } catch(e) {
                window.sendToRN('final_data', { status: 'failed', reason: 'Script Error: ' + e.message });
              }
            })();
            true;
          `);

          // Tunggu hasil dari web
          const resultData = await waitForResult();

          // E. EVALUASI HASIL
          if (resultData.status === 'success') {
            isRowSolved = true;
            finalRowResult = resultData;
            addLog(`✅ SUKSES: ${resultData.Name}`);
            
            const newResult: AutomationResult = {
              KPJ_Number: resultData.KPJ,
              NIK_Number: resultData.NIK,
              Full_Name: resultData.Name,
              Birth_Date: resultData.BirthDate,
              Email: '', kabupaten: '', kecamatan: '', kelurahan: '',
              Lasik_Result: 'OK'
            };
            setResults(prev => [...prev, newResult]);
            setProgress(p => ({ ...p, success: p.success + 1 }));

          } else {
            // Gagal
            addLog(`❌ Percobaan ${captchaAttempts} Gagal: ${resultData.reason}`);
            
            // Cek apakah boleh retry?
            const isCaptchaError = resultData.isCaptchaError || resultData.reason.toLowerCase().includes('captcha');
            
            if (isCaptchaError && captchaAttempts < MAX_CAPTCHA_RETRIES) {
               addLog('🔁 Captcha salah, mencoba lagi dengan gambar baru...');
               // Loop berlanjut
            } else {
               // Error fatal (misal KPJ tidak terdaftar), stop retry
               finalRowResult = resultData;
               break; 
            }
          }
        } // END WHILE LOOP

        // Jika sudah max retry dan tetap gagal
        if (!isRowSolved) {
           setProgress(p => ({ ...p, failed: p.failed + 1 }));
           addLog(`💀 Gagal Final: ${finalRowResult.reason}`);
        }

      } catch (error: any) {
        addLog(`❌ Error System Row ${i + 1}: ${error.message}`);
      }
    }
    stopRun();
  };

  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'solve_captcha':
          // Teruskan ke resolver di dalam loop
          if (captchaResolver.current) captchaResolver.current(data.payload);
          break;
          
        case 'final_data':
          // Teruskan ke resolver di dalam loop
          if (automationResolver.current) automationResolver.current(data.payload);
          break;

        case 'error':
          addLog(`⚠️ Web Log: ${data.payload}`);
          if (data.payload.includes('captcha') && captchaResolver.current) {
             captchaResolver.current(null); 
          }
          break;
      }
    } catch (e) { console.log('Msg Error', e); }
  };

  return { isRun, progress, results, currentUrl, pilotRun, stopRun, onMessage, onPageLoadFinished: () => pageLoadResolver.current?.() };
};