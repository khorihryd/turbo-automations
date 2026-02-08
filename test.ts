                // 3. POLLING POPUP HASIL (Diperpanjang durasinya)
                   // Cek berbagai kemungkinan popup (SweetAlert2)
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
                   
                   // --- TIMEOUT WEB SIDE ---
