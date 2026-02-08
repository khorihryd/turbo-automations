import 'react-native-url-polyfill/auto';
import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { AutomationResult } from '../interfaces/Automation';
import { CONFIG } from '../constants/Config';
import { CaptchaService } from '../services/CaptchaService';

export const useOssAutomation = (
  excelData: any[][],
  webViewRef: React.RefObject<WebView | null>,
  addLog: (msg: string) => void,
  apiKey: string
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

  const MAX_RETRY_ATTEMPTS = 10;
  const MAX_CAPTCHA_RETRIES = 3;

  useEffect(() => {
    checkBalance(apiKey);
  }, [balance]);

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
      }, 90000); // Diperpanjang menjadi 90 detik
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
    addLog(balance);

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
                // Jika ini percobaan kedua atau lebih, tutup popup error terlebih dahulu
                if(${captchaAttempts} > 1) { 
                  const errorPopup = document.querySelector('div.swal2-container');
                  if(errorPopup) {
                    const okBtn = document.querySelector('button.swal2-confirm');
                    if(okBtn) {
                      okBtn.click();
                      // Tunggu popup tertutup
                      setTimeout(() => {
                        // Lanjutkan proses...
                      }, 1000);
                    }
                  }
                }

                const processStart = () => {
                    if(window.automation.click('#collapse_sudah')) {
                        setTimeout(() => {
                           window.automation.fill('#kpj', '${row}');
                           
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
            code = await service.solve(captchaBase64);
            addLog(`🔑 Solved: ${code}`);
          } catch (e: any) {
            addLog(`⚠️ 2Captcha Failed: ${e.message}`);
            continue;
          }

          // D. SUBMIT & TUNGGU HASIL (2-POPUP FLOW)
          const submitScript = `
            (function() {
              try {
                window.sendToRN('error', '🖱️ Mencoba Submit Data...');
                
                // 1. ISI CAPTCHA
                window.automation.fill('#captcha_kpj', '${code}');
                
                // 2. KLIK TOMBOL SUBMIT      
                if(typeof cekStatusKpj === 'function') {
                   window.sendToRN('error', '👉 Menggunakan fungsi cekStatusKpj()');
                   cekStatusKpj();
                } else {
                   throw new Error("Tombol Submit tidak ditemukan");
                }

                // 3. POLLING POPUP HASIL - MENANGANI 2 POPUP
                let popupStage = 0; // 0: belum ada, 1: popup pertama, 2: popup kedua
                let finalName = '';
                let checks = 0;
                const maxChecks = 60; // Maksimal 60 detik
                
                const checkPopup = setInterval(() => {
                    checks++;
                    const popup = window.automation.checkPopupOss();
                    const title = popup.title.toLowerCase();
                    const content = popup.content.toLowerCase();
                    
                    // --- POPUP PERTAMA: HASIL CEK KPJ ---
                    if (popupStage === 0 && (title.includes('berhasil') || title.includes('gagal'))) {
                        popupStage = 1;
                        window.sendToRN('error', '✅ Popup pertama ditemukan: ' + title);
                        
                        // KONDISI SUKSES (Popup pertama)
                        if (title.includes('berhasil')) {
                            finalName = popup.content; // Simpan nama dari popup pertama
                            
                            // Klik OK/Lanjutkan pada popup pertama
                            const btnConfirm = document.querySelector('button.swal2-confirm');
                            if (btnConfirm) {
                                btnConfirm.click();
                                window.sendToRN('error', '🖱️ Klik tombol OK pada popup pertama');
                            }
                            // Tunggu popup kedua (UMP)
                        }
                        // KONDISI GAGAL (Popup pertama)
                        else if (title.includes('gagal')) {
                            clearInterval(checkPopup);
                            
                            // Cek jenis kegagalan
                            const isCaptchaError = title.includes('captcha') || content.includes('captcha') || content.includes('salah');
                            
                            // Jika gagal karena captcha salah, klik OK dulu
                            if (isCaptchaError) {
                                const btnConfirm = document.querySelector('button.swal2-confirm');
                                if (btnConfirm) btnConfirm.click();
                            }
                            
                            // Kirim status gagal ke RN
                            window.sendToRN('final_data', { 
                                status: 'failed', 
                                reason: popup.title + " " + popup.content,
                                isCaptchaError: isCaptchaError
                            });
                            return;
                        }
                    }
                    
                    // --- POPUP KEDUA: KONFIRMASI UMP ---
                    else if (popupStage === 1) {
                        popupStage = 2;
                        window.sendToRN('error', '✅ Popup kedua (UMP) ditemukan');
                        
                        // Klik OK atau klik container untuk menutup popup kedua
                        const btnConfirm = document.querySelector('button.swal2-confirm');
                        if (btnConfirm) {
                            btnConfirm.click();
                            window.sendToRN('error', '🖱️ Klik tombol OK pada popup kedua');
                        } else {
                            // Klik di luar popup (container)
                            const modalContainer = document.querySelector('div.swal2-container');
                            if (modalContainer) modalContainer.click();
                            window.sendToRN('error', '🖱️ Klik container pada popup kedua');
                        }
                        
                        // Tunggu sebentar sebelum kirim data final
                        setTimeout(() => {
                            clearInterval(checkPopup);
                            window.sendToRN('final_data', {
                                KPJ: '${row}',
                                NIK: window.automation.getText('#no_identitas'),
                                Name: finalName,
                                BirthDate: window.automation.getText('#tgl_lahir'),
                                status: 'success'
                            });
                        }, 1000);
                        
                        return;
                    }
                    
                    // --- TIMEOUT HANDLING ---
                    if (checks >= maxChecks) {
                        clearInterval(checkPopup);
                        let errorReason = '';
                        const modalContainer = document.querySelector('div.swal2-container');
                        if (modalContainer) modalContainer.click();
                        
                        if (popupStage === 0) {
                            errorReason = 'Popup pertama tidak muncul setelah 60 detik';
                        } else if (popupStage === 1) {
                            errorReason = 'Popup kedua (UMP) tidak muncul setelah popup pertama';
                        }
                        
                        window.sendToRN('final_data', { 
                            status: 'timeout', 
                            reason: errorReason,
                            popupStage: popupStage
                        });
                    }
                    
                }, 1000);
                
              } catch(e) {
                window.sendToRN('final_data', { 
                    status: 'failed', 
                    reason: 'Script Error: ' + e.message 
                });
              }
            })();
            true;
          `;

          webViewRef.current?.injectJavaScript(submitScript);

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
              Email: '', 
              kabupaten: '', 
              kecamatan: '', 
              kelurahan: '',
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
      
      // Debug log
      console.log('WebView Message:', data.type, data.payload?.substring?.(0, 100) || data.payload);
      
      switch (data.type) {
        case 'solve_captcha':
          if (captchaResolver.current) {
            addLog('📸 Gambar captcha diterima dari WebView');
            captchaResolver.current(data.payload);
          }
          break;
          
        case 'final_data':
          addLog(`📨 Data final: ${JSON.stringify(data.payload).substring(0, 100)}...`);
          if (automationResolver.current) {
            automationResolver.current(data.payload);
            automationResolver.current = null;
          }
          break;

        case 'error':
          addLog(`⚠️ Web Log: ${data.payload}`);
          // Jika error terkait captcha, batalkan proses captcha
          if (data.payload.includes('captcha') && captchaResolver.current) {
             captchaResolver.current(null);
             captchaResolver.current = null;
          }
          break;
      }
    } catch (e) { 
      console.log('Message Parse Error', e);
      addLog('❌ Gagal parsing message dari WebView');
    }
  };

  const onPageLoadFinished = () => {
    if (pageLoadResolver.current) {
      pageLoadResolver.current();
      pageLoadResolver.current = null;
    }
    if (pageLoadTimeoutId.current) {
      clearTimeout(pageLoadTimeoutId.current);
      pageLoadTimeoutId.current = null;
    }
  };

  return { 
    isRun, 
    progress, 
    results, 
    currentUrl, 
    pilotRun, 
    stopRun, 
    onMessage, 
    onPageLoadFinished 
  };
};