import { CONFIG } from "../constants/Config";

// ================= SERVICE CLASS (CAPTCHA) =================
export class CaptchaService {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async solve(base64Image: string): Promise<string> {
    try {
      const cleanImage = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const formData = new FormData();
      formData.append('key', this.apiKey);
      formData.append('method', 'base64');
      formData.append('body', cleanImage);
      formData.append('json', '1');

      const postRes = await fetch(`${CONFIG.CAPTCHA_API_URL}/in.php`, { method: 'POST', body: formData });
      const postJson = await postRes.json();
      if (postJson.status !== 1) throw new Error(`Upload failed: ${postJson.request}`);

      const requestId = postJson.request;
      let attempts = 0;
      while (attempts < 20) {
        await new Promise(r => setTimeout(r, 2000));
        const getRes = await fetch(`${CONFIG.CAPTCHA_API_URL}/res.php?key=${this.apiKey}&action=get&id=${requestId}&json=1`);
        const getJson = await getRes.json();
        if (getJson.status === 1) return getJson.request;
        if (getJson.request !== 'CAPCHA_NOT_READY') throw new Error(`Error: ${getJson.request}`);
        attempts++;
      }
      throw new Error('Timeout solving captcha');
    } catch (error: any) { throw error; }
  }

  async getBalance(): Promise<string> {
    try {
      const res = await fetch(`${CONFIG.CAPTCHA_API_URL}/res.php?key=${this.apiKey}&action=getbalance&json=1`);
      const data = await res.json();
      return data.status === 1 ? data.request : 'Error';
    } catch { return 'Error'; }
  }
}