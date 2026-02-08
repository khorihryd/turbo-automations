//set interval accordion-modal
cek #accordion-modal
if true #collapse_sudah //clear interval
if false ulangi
//end 

//input no kpj
#kpj //kolom kpj
#img_captcha_kpj //ambil gambar captcha
kirim gambar ke 2captcha
if true isi kolom captcha #captcha_kpj
tekan tombol cekStatusKpj();
else ulangi maxAttempt 3x

//set interval menunggu popup hasil




                 if(title.includes('berhasil') || title.includes('konfirmasi') || content.includes('pengajuan klaim')) {
                    clearInterval(interval);
                    const finalName = content;
                    
                    // Klik OK
                    const btn = document.querySelector('button.swal2-confirm');
                    if(btn) btn.click();

                    //harusnya disini tunggu beberapa detik agar modalPop muncul

                    const modalPop = document.querySelector('div.swal2-container');
                    if(modalPop) modalPop.click();

                    window.sendToRN('final_data', {
                        KPJ: '${row}',
                        NIK: window.automation.getText('#no_identitas'),
                        Name: finalName,
                        BirthDate: window.automation.getText('#tgl_lahir'),
                        status: 'success'
                    });
                 }




          webViewRef.current?.injectJavaScript(`
            (function() {
              window.automation.fill('#captcha_kpj', '${code}');
              
              // Klik Submit
              if(typeof cekStatusKpj === 'function') {
                 cekStatusKpj();
              } else {
                 const btn = document.querySelector('button[type="submit"]'); 
                 if(btn) btn.click();
              }

              // Polling Popup Hasil
              let checks = 0;
              const interval = setInterval(() => {
                 checks++;
                 const popup = window.automation.checkPopupOss(); 
                 const generic = window.automation.checkPopup('.swal2-title', '.swal2-content');
                 
                 const title = (popup.title || generic.title || '').toLowerCase();
                 const content = (popup.content || generic.content || '').toLowerCase();

                 // SUKSES
                 if(title.includes('berhasil') || title.includes('konfirmasi') || content.includes('pengajuan klaim')) {
                    clearInterval(interval);
                    const finalName = content;
                    
                    // 1. Klik Tombol OK/Konfirmasi
                    const btn = document.querySelector('button.swal2-confirm');
                    if(btn) btn.click();

                    // 2. Beri jeda agar animasi popup selesai atau modal menutup
                    setTimeout(() => {
                        // Coba klik container untuk menutup overlay jika masih ada
                        const modalPop = document.querySelector('div.swal2-container');
                        if(modalPop) modalPop.click();

                        // Kirim data ke React Native setelah jeda
                        window.sendToRN('final_data', {
                            KPJ: '${row}',
                            NIK: window.automation.getText('#no_identitas'),
                            Name: finalName,
                            BirthDate: window.automation.getText('#tgl_lahir'),
                            status: 'success'
                        });
                    }, 2000); // <--- Delay 2 detik (2000ms) ditambahkan di sini
                 }
                 // GAGAL
                 else if(title.includes('gagal') || title.includes('salah') || title.includes('tidak terdaftar') || content.includes('salah')) {
                    clearInterval(interval);
                    window.sendToRN('final_data', { 
                        status: 'failed', 
                        reason: title + " " + content,
                        // Flag khusus untuk mendeteksi error captcha
                        isCaptchaError: (title.includes('captcha') || content.includes('captcha') || content.includes('salah')) 
                    });
                 }

                 if(checks > 20) {
                    clearInterval(interval);
                    window.sendToRN('final_data', { status: 'timeout', reason: 'No popup appears' });
                 }
              }, 1000);
            })();
            true;
          `);

