export const INJECTED_FUNCTIONS = `
  window.sendToRN = function(type, payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
  };

  window.automation = {
    click: function(selector) {
      const el = document.querySelector(selector);
      if(el) { el.click(); return true; }
      return false;
    },
    fill: function(selector, value) {
      const el = document.querySelector(selector);
      if(el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    },
    getNama: function(selector) {
      const el = document.querySelector(selector);
      return el ? el.textContent.match(/atas nama (.*?) terdaftar/i)?.[1] : '';
    },
    getText: function(selector) {
      const el = document.querySelector(selector);
      return el ? (el.value || el.innerText || '').trim() : '';
    },
    getCaptcha: function(selector) {
      const img = document.querySelector(selector);
      if(!img) return null;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/png');
    },
    getCleanImageForAI: function(selector){
    const img = document.querySelector(selector);
    
    if(!img) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // 1. Beri background putih agar teks terlihat jelas oleh AI
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Gambar ulang dengan kualitas asli
    ctx.drawImage(img, 0, 0);

    // 3. Ambil base64 tanpa prefix "data:image/png;base64,"
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    return base64;
    },
    checkPopup: function(selectorTitle,selectorContainer) {
      const title = document.querySelector(selectorTitle);
      const content = document.querySelector(selectorContainer);
      return {
        title: title ? title.innerText : null,
        content: content ? content.innerText : null
      };
    },
    checkPopupDPT: function() {
      const title = document.querySelector('#root > main > div.container > div > div > div > div > div > div:nth-child(1) > div > div > div > div > div > div > div.bottom_x > div.column > h2');
      const content = document.querySelector('#root > main > div.container > div > div > div > div > div > div:nth-child(1) > div > div > div > div > div > div > div.bottom_x > div.column > p');
      const nama = document.querySelector('#root > main > div.container > div > div > div > div > div > div:nth-child(1) > div > div > div > div > div > div > div.bottom_x > div.column > h2 > b');
      const kel = document.querySelector('#root > main > div.container > div > div > div > div > div > div:nth-child(1) > div > div > div > div > div > div > div.bottom_x > div.column > p > b:nth-child(1)');
      const kab = document.querySelector('#root > main > div.container > div > div > div > div > div > div:nth-child(1) > div > div > div > div > div > div > div.bottom_x > div.column > p > b:nth-child(2)');
      return {
        nama: nama? nama.innerText : null,
        kelurahan: kel ? kel.innerText : null,
        kabupaten: kab ? kab.innerText : null,
      };
    },
    checkPopupOss: function() {
      const title = document.querySelector('h2.swal2-title');
      const content = document.querySelector('div.swal2-content');
      return {
        title: title ? title.innerText : null,
        content: content ? content.innerText.match(/atas nama (.*?) terdaftar/i)?.[1] : null
      };
    },
    checkPopupLasik: function(){
      const title = document.querySelector('#swal2-title');
      const content = document.querySelector("#swal2-content");
      return {
        title: title? title.innerText : null,
        content: content? content.innerText : null,
      }
    },
    waitFor: function(selector){
    const el = document.querySelector(selector);
    let attempts = 0;
    const waiting = setInterval(()=>{
        if(el){
        clearInterval(waiting)
        }
        if(attempts > 20){
          clearInterval(waiting)
        }
      },1000)
    }
  };
`;