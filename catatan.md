//data hasil berhasil

#root > main > div.container > div > div > div > div > div > div:nth-child(1) > div > div > div > div > div > div > div.bottom_x > div.column > p



const popup = window.automation.checkPopupDPT();
            window.automation.fill('#__BVID__20','${dpt}');
            window.sendToRN('cek','membuat variable popup');
            window.automation.click('#root > main > div.container > div > div > div > div > div > div.wizard-buttons > div:nth-child(2) > button')
            setTimeout(()=>{
            if(popup.title.include('Selamat')){
                const data = {
                  nama: popup.nama,
                  ktp: ${dpt},
                  kelurahan: popup.kel,
                  kecamatan: popup.kec
                }
                window.sendToRN('final_data', data);
            }else{
              window.sendToRN('error', 'data tidak ada');
            }
            },1500);