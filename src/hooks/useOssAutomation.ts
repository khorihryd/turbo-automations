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

  /**
   * Menyimpan data sementara setelah sukses popup pertama.
   * Digunakan untuk menunggu reload dan mengecek popup kedua.
   */
  const pendingSuccessData = useRef<{
    row: string;
    finalName: string;
    timestamp: number;
  } | null>(null);

  const MAX_RETRY_ATTEMPTS = 10;
  const MAX_CAPTCHA_RETRIES = 3;

  useEffect(() => {
    checkBalance(apiKey);
  }, []); // Hanya sekali di awal

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
      }, 90000); // 90 detik untuk proses 2 popup
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
    pendingSuccessData.current = null;
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
    
    const service = new CaptchaService(apiKey);

    // Inisialisasi sesi halaman
    setCurrentUrl(CONFIG.TARGET_URL_OSS1);
    await new Promise(r => setTimeout(r, 5000));
    setCurrentUrl(CONFIG.TARGET_URL_OSS2);
    await new Promise(r => setTimeout(r, 7000));

    // Loop setiap baris Excel
    for (let i = 0; i < excelData.length; i++) {
      if (!isRunRef.current) break;

      const row = excelData[i];
      setProgress(p => ({ ...p, current: i + 1, pending: excelData.length - (i + 1) }));

      try {
        // 1. Reload halaman untuk fresh state
        let pageLoaded = false;
        let retryCount = 0;
        
        while (!pageLoaded && retryCount < MAX_RETRY_ATTEMPTS && isRunRef.current) {
          try {
            webViewRef.current?.injectJavaScript(`(function (){window.location.href = '${CONFIG.TARGET_URL_OSS2}'})();true;`);
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

        let captchaAttempts = 0;
        let isRowSolved = false;
        let finalRowResult: any = { status: 'failed', reason: 'Max Retries' };

        // Loop percobaan captcha (max 3x)
        while (captchaAttempts < MAX_CAPTCHA_RETRIES && !isRowSolved && isRunRef.current) {
          captchaAttempts++;
          if (captchaAttempts > 1) addLog(`🔄 Retry Captcha ke-${captchaAttempts}...`);

          // A. Ambil gambar captcha
          const injectionScript = `
            (function(){
              try {
                // Tutup popup error jika ada (untuk retry)
                if(${captchaAttempts} > 1) { 
                  const errorPopup = document.querySelector('div.swal2-container');
                  if(errorPopup) {
                    const okBtn = document.querySelector('button.swal2-confirm');
                    if(okBtn) okBtn.click();
                  }
                }

                const processStart = () => {
                    if(window.automation && window.automation.click('#collapse_sudah')) {
                        setTimeout(() => {
                           window.automation.fill('#kpj', ${JSON.stringify(row)});
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
          const captchaBase64 = await waitForCaptchaImage();
          if (!captchaBase64) {
            addLog('⚠️ Gagal mendapatkan gambar, skip retry ini.');
            continue; 
          }

          // B. Solve captcha dengan 2Captcha
          addLog(`🧩 Sending to 2Captcha (${captchaAttempts}/${MAX_CAPTCHA_RETRIES})...`);
          let code = '';
          try {
            code = await service.solve(captchaBase64);
            addLog(`🔑 Solved: ${code}`);
          } catch (e: any) {
            addLog(`⚠️ 2Captcha Failed: ${e.message}`);
            continue;
          }

          // C. Submit dan tangani popup pertama (hasil cek KPJ)
          const submitScript = `
            (function() {
              try {
                window.sendToRN('error', '🖱️ Mencoba Submit Data...');
                
                window.automation.fill('#captcha_kpj', ${JSON.stringify(code)});
                
                if(typeof cekStatusKpj === 'function') {
                   window.sendToRN('error', '👉 Menggunakan fungsi cekStatusKpj()');
                   cekStatusKpj();
                } else {
                   throw new Error("Tombol Submit tidak ditemukan");
                }

                let popupChecked = false;
                let checks = 0;
                const maxChecks = 30;
                
                const checkPopup = setInterval(() => {
                    checks++;
                    const popup = window.automation.checkPopupOss();
                    const title = popup.title ? popup.title.toLowerCase() : '';
                    const content = popup.content ? popup.content.toLowerCase() : '';
                    
                    if (!popupChecked && (title.includes('berhasil') || title.includes('gagal'))) {
                        popupChecked = true;
                        clearInterval(checkPopup);
                        
                        if (title.includes('berhasil')) {
                            // Ambil nama dari popup
                            const finalName = popup.content || '';
                            
                            window.sendToRN('first_popup_success', {
                                KPJ: ${JSON.stringify(row)},
                                Name: finalName
                                // NIK dan BirthDate tidak diambil di sini (akan diambil setelah popup kedua)
                            });
                            
                            // Klik OK untuk lanjut (trigger reload halaman)
                            const btnConfirm = document.querySelector('button.swal2-confirm');
                            if (btnConfirm) btnConfirm.click();
                            
                        } else if (title.includes('gagal')) {
                            const isCaptchaError = title.includes('captcha') || content.includes('captcha') || content.includes('salah');
                            
                            // Tutup popup error
                            const btnConfirm = document.querySelector('button.swal2-confirm');
                            if (btnConfirm) btnConfirm.click();
                            
                            window.sendToRN('final_data', { 
                                status: 'failed', 
                                reason: popup.title + " " + popup.content,
                                isCaptchaError: isCaptchaError,
                                KPJ: ${JSON.stringify(row)}
                            });
                        }
                    }
                    
                    if (checks >= maxChecks) {
                        clearInterval(checkPopup);
                        window.sendToRN('final_data', { 
                            status: 'timeout', 
                            reason: 'Popup pertama tidak muncul',
                            KPJ: ${JSON.stringify(row)}
                        });
                    }
                }, 1000);
                
              } catch(e) {
                window.sendToRN('final_data', { 
                    status: 'failed', 
                    reason: 'Script Error: ' + e.message,
                    KPJ: ${JSON.stringify(row)}
                });
              }
            })();
            true;
          `;

          webViewRef.current?.injectJavaScript(submitScript);

          // Tunggu hasil dari WebView (first_popup_success atau final_data jika gagal)
          const resultData = await waitForResult();

          // D. Evaluasi hasil
          if (resultData.status === 'first_popup_success') {
            // Sukses popup pertama: simpan data sementara, tunggu reload & popup kedua
            pendingSuccessData.current = {
              row: resultData.KPJ,
              finalName: resultData.Name,
              timestamp: Date.now()
            };
            addLog(`✅ Popup pertama sukses untuk KPJ ${resultData.KPJ}, menunggu reload...`);
            
            // Keluar dari while captcha, lanjut ke proses reload & popup kedua
            // isRowSolved masih false, nanti akan di-set setelah final_data sukses
            break;

          } else {
            // Gagal (captcha error, KPJ tidak terdaftar, timeout, dll)
            addLog(`❌ Percobaan ${captchaAttempts} Gagal: ${resultData.reason}`);
            const isCaptchaError = resultData.isCaptchaError || resultData.reason?.toLowerCase().includes('captcha');
            
            if (isCaptchaError && captchaAttempts < MAX_CAPTCHA_RETRIES) {
               addLog('🔁 Captcha salah, mencoba lagi dengan gambar baru...');
               // Loop berlanjut
            } else {
               // Error fatal (bukan captcha atau habis retry)
               finalRowResult = resultData;
               break;
            }
          }
        } // end while captcha

        // --- Penanganan setelah keluar dari loop captcha ---
        if (pendingSuccessData.current) {
          addLog(`⏳ Menunggu popup kedua untuk KPJ ${pendingSuccessData.current.row}...`);
          // Tunggu hingga final_data diterima (dari onPageLoadFinished)
          const finalResult = await waitForResult();
          
          if (finalResult.status === 'success') {
            isRowSolved = true;
            addLog(`✅ SUKSES: ${finalResult.Name}`);
          } else {
            finalRowResult = finalResult;
            addLog(`❌ Gagal popup kedua: ${finalResult.reason}`);
          }
        }

        // Update progress dan results jika row belum solved
        if (!isRowSolved) {
          setProgress(p => ({ ...p, failed: p.failed + 1 }));
          addLog(`💀 Gagal Final: ${finalRowResult.reason || 'Unknown error'}`);
        }

      } catch (error: any) {
        addLog(`❌ Error System Row ${i + 1}: ${error.message}`);
      }
    } // end for loop

    stopRun();
  };

  // --- Handler pesan dari WebView ---
  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView Message:', data.type, JSON.stringify(data.payload).substring(0, 150));

      switch (data.type) {
        case 'solve_captcha':
          if (captchaResolver.current) {
            addLog('📸 Gambar captcha diterima');
            captchaResolver.current(data.payload);
            captchaResolver.current = null;
          }
          break;

        case 'first_popup_success':
          addLog(`✅ Popup pertama sukses untuk KPJ ${data.payload.KPJ}`);
          // Simpan data sementara (NIK dan BirthDate belum ada)
          pendingSuccessData.current = {
            row: data.payload.KPJ,
            finalName: data.payload.Name,
            timestamp: Date.now()
          };
          // Beri sinyal ke pilotRun bahwa popup pertama sukses
          if (automationResolver.current) {
            automationResolver.current({ status: 'first_popup_success', ...data.payload });
            automationResolver.current = null;
          }
          break;

        case 'final_data':
          addLog(`📨 Data final: ${data.payload.status} - ${data.payload.KPJ || ''}`);
          
          if (data.payload.status === 'success') {
            // Data NIK dan BirthDate seharusnya sudah terisi dari script popup kedua
            const newResult: AutomationResult = {
              KPJ_Number: data.payload.KPJ || '',
              NIK_Number: data.payload.NIK || '',
              Full_Name: data.payload.Name || '',
              Birth_Date: data.payload.BirthDate || '',
              Email: '',
              kabupaten: '',
              kecamatan: '',
              kelurahan: '',
              Lasik_Result: 'OK'
            };
            setResults(prev => [...prev, newResult]);
            setProgress(p => ({ ...p, success: p.success + 1 }));
            pendingSuccessData.current = null; // Hapus pending data
          } else {
            // Jika gagal, tetap catat progress gagal (sudah di pilotRun)
            pendingSuccessData.current = null;
          }

          // Resolve promise yang menunggu final_data (di pilotRun)
          if (automationResolver.current) {
            automationResolver.current(data.payload);
            automationResolver.current = null;
          }
          break;

        case 'error':
          addLog(`⚠️ Web Log: ${data.payload}`);
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

  // --- Handler ketika WebView selesai loading ---
  const onPageLoadFinished = () => {
    // Resolve page load resolver (digunakan waitForPageLoad)
    if (pageLoadResolver.current) {
      pageLoadResolver.current();
      pageLoadResolver.current = null;
    }
    if (pageLoadTimeoutId.current) {
      clearTimeout(pageLoadTimeoutId.current);
      pageLoadTimeoutId.current = null;
    }

    // ===== CEK APAKAH ADA PENDING DATA DARI POPUP PERTAMA =====
    if (pendingSuccessData.current) {
      addLog(`🔄 Halaman reload terdeteksi, mengecek popup kedua untuk KPJ ${pendingSuccessData.current.row}...`);

      // Inject script untuk mencari popup kedua (UMP) dan mengambil NIK/BirthDate setelah ditutup
      const checkSecondPopupScript = `
        (function() {
          try {
            let checks = 0;
            const maxChecks = 30; // 30 detik
            
            const checkPopup = setInterval(() => {
              checks++;
              
              // Deteksi popup kedua (modal SweetAlert)
              const modalContainer = document.querySelector('div.swal2-container');
              if (!modalContainer) return;
              
              const modalTitle = modalContainer.querySelector('.swal2-title');
              const modalContent = modalContainer.querySelector('.swal2-content');
              
              const title = modalTitle ? modalTitle.innerText.toLowerCase() : '';
              const content = modalContent ? modalContent.innerText.toLowerCase() : '';
              
              // Cek apakah ini popup UMP (gunakan beberapa keyword)
              const isUMPPopup = 
                content.includes('ump') || 
                title.includes('ump') ||
                content.includes('kepesertaan') ||
                content.includes('aktif') ||
                content.includes('informasi kepesertaan');
              
              if (isUMPPopup) {
                clearInterval(checkPopup);
                window.sendToRN('error', '✅ Popup kedua (UMP) ditemukan');
                
                // === TUTUP POPUP KEDUA ===
                const confirmBtn = modalContainer.querySelector('button.swal2-confirm');
                if (confirmBtn) {
                  confirmBtn.click();
                } else {
                  // Fallback: klik container
                  modalContainer.click();
                }
                
                // === TUNGGU SEBENTAR, AMBIL NIK & TANGGAL LAHIR DARI HALAMAN ===
                setTimeout(() => {
                  // Prioritas: window.automation.getText, lalu value, lalu innerText
                  const nik = (window.automation && window.automation.getText) 
                                ? (window.automation.getText('#no_identitas') || '') 
                                : (document.querySelector('#no_identitas')?.value || 
                                   document.querySelector('#no_identitas')?.innerText || '');
                                
                  const birthDate = (window.automation && window.automation.getText)
                                ? (window.automation.getText('#tgl_lahir') || '')
                                : (document.querySelector('#tgl_lahir')?.value || 
                                   document.querySelector('#tgl_lahir')?.innerText || '');
                  
                  window.sendToRN('final_data', {
                    status: 'success',
                    KPJ: ${JSON.stringify(pendingSuccessData.current.row)},
                    NIK: nik.trim(),
                    Name: ${JSON.stringify(pendingSuccessData.current.finalName)},
                    BirthDate: birthDate.trim()
                  });
                }, 2000); // Beri waktu 2 detik agar data terisi
                
                return;
              }
              
              if (checks >= maxChecks) {
                clearInterval(checkPopup);
                window.sendToRN('final_data', { 
                  status: 'timeout', 
                  reason: 'Popup kedua (UMP) tidak muncul setelah reload',
                  KPJ: ${JSON.stringify(pendingSuccessData.current.row)}
                });
              }
            }, 1000);
          } catch(e) {
            window.sendToRN('final_data', { 
              status: 'failed', 
              reason: 'Error saat cek popup kedua: ' + e.message,
              KPJ: ${JSON.stringify(pendingSuccessData.current?.row || '')}
            });
          }
        })();
        true;
      `;
      
      webViewRef.current?.injectJavaScript(checkSecondPopupScript);
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