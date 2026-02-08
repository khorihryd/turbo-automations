/**
 * Kumpulan Script Injection untuk Automasi WebView
 */

export const AutomationScripts = {
  /**
   * Script utama untuk mengisi NIK dan menekan tombol cari
   * @param dpt - Nomor NIK yang akan dicari
   * @param rowData - Data lengkap dari Excel untuk dikirim balik ke RN
   */
  getDptSearchScript: (dpt: string, rowData: any) => `
    (function(){
      const check = setInterval(() => {
        // Pastikan library helper 'window.automation' sudah siap
        if (!window.automation) return;
        
        // Coba mengisi input field
        if(window.automation.fill('#__BVID__20', '${dpt}')) {
          clearInterval(check);
          
          // Klik tombol Cari
          window.automation.click('#root > main > div.container > div > div > div > div > div > div.wizard-buttons > div:nth-child(2) > button');
          
          // Tunggu proses loading internal website (3 detik)
          setTimeout(() => {
            const popup = window.automation.checkPopupDPT();
            const bodyText = document.body.innerText;
            const isSuccess = bodyText.includes('Selamat');
            const isNotFound = bodyText.includes('belum') || bodyText.includes('tidak terdaftar');
            
            if(isSuccess){
              window.sendToRN('final_data', {
                ...${JSON.stringify(rowData)},
                kabupaten: popup.kabupaten,
                kelurahan: popup.kelurahan,
                status: 'success'
              });
            } else if(isNotFound){
              window.sendToRN('final_data', {
                nik: '${dpt}',
                status: 'gagal',
                reason: 'Tidak terdaftar'
              });
            } else {
              window.sendToRN('error', 'Data tidak ditemukan atau error selektor');
            }
          }, 3500);
        }
      }, 1000);
      
      // Safety Timeout: Berhenti jika dalam 30 detik tidak ada respon
      setTimeout(() => {
        clearInterval(check);
        window.sendToRN('error', 'script_timeout');
      }, 30000);
    })();
    true;
  `,

  /**
   * Script untuk membersihkan state atau elemen tertentu sebelum reload (opsional)
   */
  getCleanupScript: () => `
    console.log('Cleaning up automation state...');
    // Logika tambahan jika diperlukan
    true;
  `
};