import { TaskPlan, TaskStep } from '../../core/types/taskTree';

const LLM_BASE_URL = 'https://token.sensenova.ai/v1';
const LLM_API_KEY = 'sk-1aoBmAqJK9qd4Wu9DrhZq3PPoi7RlvQq';
const LLM_MODEL = 'sensenova-6.8-flash-lite';

export class TaskDecomposer {
  public static async decomposeInstruction(instruction: string): Promise<TaskPlan> {
    const prompt = `
Anda adalah ahli AI otomasi web. Tugas Anda adalah memecah instruksi pengguna menjadi langkah-langkah hierarkis (Tree) yang masuk akal dan dapat dieksekusi secara berurutan.

Instruksi Pengguna: "${instruction}"

Buatlah array berformat JSON murni yang berisi langkah-langkah tugas.
Skema setiap langkah:
{
  "id": "step-1",
  "description": "Deskripsi aksi (contoh: Buka halaman Tokopedia)",
  "actionType": "NAVIGATE" | "CLICK" | "INPUT" | "EXTRACT" | "WAIT" | "LOGIC",
  "targetPredict": "URL atau nama elemen target (opsional, contoh: https://tokopedia.com atau 'Tombol Login')",
  "dependencies": [] // ID langkah yang harus selesai sebelum ini
}

Output HARUS berupa JSON murni (tanpa tag markdown \`\`\`json).
Contoh Output:
[
  {
    "id": "step-1",
    "description": "Buka halaman login",
    "actionType": "NAVIGATE",
    "targetPredict": "https://example.com/login",
    "dependencies": []
  },
  {
    "id": "step-2",
    "description": "Isi username",
    "actionType": "INPUT",
    "targetPredict": "Field Username",
    "dependencies": ["step-1"]
  }
]
`;

    try {
      const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        })
      });

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Clean potential markdown blocks
      const cleanedContent = content.replace(/^```json/g, '').replace(/```$/g, '').trim();
      
      const stepsRaw = JSON.parse(cleanedContent);
      const steps: TaskStep[] = stepsRaw.map((s: any) => ({
        ...s,
        status: 'PENDING'
      }));

      return {
        id: `plan-${Date.now()}`,
        originalInstruction: instruction,
        steps
      };

    } catch (err: any) {
      throw new Error(`Gagal memecah instruksi: ${err.message}`);
    }
  }

  public static async revalidatePlan(plan: TaskPlan): Promise<{ valid: boolean; reason?: string }> {
    const prompt = `
Berikut adalah sebuah rencana eksekusi tugas otomatisasi web:
${JSON.stringify(plan.steps, null, 2)}

Apakah urutan dan tipe aksi tersebut masuk akal secara logika?
Jawab hanya dengan JSON: {"valid": true/false, "reason": "penjelasan singkat jika false"}
`;

    try {
      const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        })
      });

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      const cleanedContent = content.replace(/^```json/g, '').replace(/```$/g, '').trim();
      
      const result = JSON.parse(cleanedContent);
      return {
        valid: result.valid === true,
        reason: result.reason
      };
    } catch {
      // Fallback
      return { valid: true };
    }
  }
}
