import { AgentToolPlugin } from '../../core/types/plugin';

export const VisionAnalysisTool: AgentToolPlugin = {
  definition: {
    name: 'analyze_vision',
    description: 'Ambil screenshot halaman saat ini dan analisis visualnya menggunakan LLM Vision. Gunakan untuk mencari teks di Canvas, posisi elemen, atau memahami tata letak yang tidak terdeteksi oleh DOM.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Instruksi analisis visual (contoh: "Di mana posisi tombol Login? Berikan koordinat x,y perkiraan")' },
        model: { type: 'string', description: 'Nama model vision yang digunakan (default: sensenova-6.8-flash-lite)' },
      },
      required: ['prompt'],
    },
  },
  handler: async (params: { prompt: string; model?: string }) => {
    try {
      // 1. Capture screen via chrome API
      const dataUrl = await new Promise<string>((resolve, reject) => {
        chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(dataUrl);
          }
        });
      });

      // 2. Setup LLM Call
      const model = params.model || 'sensenova-6.8-flash-lite';
      const apiKey = 'sk-bYHO7aecKIXDotP3seUUd5jWfQu3e2gs'; 
      const baseURL = 'https://token.sensenova.ai/v1';

      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: params.prompt },
                { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 1024,
        })
      });

      if (!response.ok) {
         throw new Error(`Vision API error: ${response.statusText}`);
      }

      const data = await response.json();
      const analysisResult = data.choices?.[0]?.message?.content || 'Tidak dapat menganalisis gambar.';
      
      return {
        success: true,
        data: analysisResult,
        screenshotUrl: dataUrl
      };

    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
};

export default VisionAnalysisTool;
