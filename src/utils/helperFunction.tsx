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
    getText: function(selector) {
      const el = document.querySelector(selector);
      return el ? (el.value || el.innerText || '').trim() : '';
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
    }
  };
`;