import { CoordinatorMessage, SwarmTask, WorkerMessage } from '../../core/types/multiAgent';
import { WorkerAgent } from './WorkerAgent';
import { AutonomousPlanner } from './AutonomousPlanner';
import { BackgroundToolExecutor } from '../../background';

export class CoordinatorAgent {
  private taskQueue: SwarmTask[] = [];
  private activeWorkers: Map<string, WorkerAgent> = new Map();
  private maxConcurrency: number = 3;
  private plannerFactory: () => AutonomousPlanner;

  constructor(plannerFactory: () => AutonomousPlanner) {
    this.plannerFactory = plannerFactory;
    
    // Listen for worker messages
    chrome.runtime.onMessage.addListener((message: WorkerMessage | CoordinatorMessage) => {
      if (message.type === 'WORKER_RESULT' || message.type === 'WORKER_ERROR') {
        this.handleWorkerCompletion(message.workerId);
      }
    });
  }

  public dispatchSubTasks(tasks: Omit<SwarmTask, 'status' | 'createdAt'>[]): void {
    const newTasks: SwarmTask[] = tasks.map(t => ({
      ...t,
      status: 'QUEUED',
      createdAt: Date.now()
    }));
    
    this.taskQueue.push(...newTasks);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.activeWorkers.size < this.maxConcurrency && this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (task) {
        this.spawnWorker(task);
      }
    }
  }

  private async spawnWorker(task: SwarmTask): Promise<void> {
    const workerPlanner = this.plannerFactory();
    // Assuming background tool executor can open new tabs
    const worker = new WorkerAgent(task.workerId, -1, workerPlanner);
    
    this.activeWorkers.set(task.workerId, worker);
    
    // Fire and forget, the worker will broadcast its status
    worker.runTask(task.instruction, task.url);
  }

  private handleWorkerCompletion(workerId: string): void {
    if (this.activeWorkers.has(workerId)) {
      this.activeWorkers.delete(workerId);
      this.processQueue();
    }
  }

  public async aggregateResults(goal: string, results: any[]): Promise<string> {
    const planner = this.plannerFactory();
    const prompt = `Anda adalah Coordinator Agent.
Goal Utama: "${goal}"

Berikut adalah kumpulan hasil dari para Worker Agent:
${JSON.stringify(results, null, 2)}

Buatlah ringkasan akhir terpadu yang menjawab Goal Utama, format menggunakan Markdown (buat tabel perbandingan jika memungkinkan). Jika ada worker yang gagal, sebutkan bagian mana yang gagal (Partial Success).`;

    const response = await fetch('https://token.sensenova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer sk-1aoBmAqJK9qd4Wu9DrhZq3PPoi7RlvQq`, // Hardcoded for now based on TaskDecomposer
      },
      body: JSON.stringify({
        model: 'sensenova-6.8-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}
