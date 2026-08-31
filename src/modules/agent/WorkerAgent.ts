import { WorkerMessage, WorkerStatus } from '../../core/types/multiAgent';
import { AutonomousPlanner } from './AutonomousPlanner';
import { BackgroundToolExecutor } from '../../background';

export class WorkerAgent {
  private workerId: string;
  private tabId: number;
  private planner: AutonomousPlanner;
  private isRunning: boolean = false;

  constructor(workerId: string, tabId: number, planner: AutonomousPlanner) {
    this.workerId = workerId;
    this.tabId = tabId;
    this.planner = planner;
  }

  public async runTask(instruction: string, url: string): Promise<void> {
    this.isRunning = true;
    this.broadcastStatus('RUNNING', 'Inisialisasi task di tab background...');

    try {
      // Create new tab or navigate to URL
      const toolExecutor = this.planner['toolExecutor'] as BackgroundToolExecutor;
      
      let targetTabId = this.tabId;
      if (this.tabId === -1) {
         const newTab = await toolExecutor.createTab(url);
         if (newTab) targetTabId = newTab.id;
      } else {
         await chrome.tabs.update(this.tabId, { url });
      }

      // Wait a bit for navigation
      await new Promise(r => setTimeout(r, 2000));

      let finalResult = 'Task completed without specific return data.';
      
      const userMsg = {
         id: `msg-${Date.now()}`,
         role: 'user',
         content: instruction,
         timestamp: new Date().toISOString()
      };

      await this.planner.runSuperAgentLoop(
        instruction,
        [userMsg as any],
        (msg, ctx) => {
          this.broadcastStatus('RUNNING', ctx?.statusText || msg.content);
          if (msg.role === 'assistant' && msg.content && !msg.toolCall) {
            finalResult = msg.content;
          }
        },
        () => !this.isRunning,
        () => {} // require approval handler for worker
      );

      this.broadcastStatus('COMPLETED', finalResult, finalResult);

    } catch (err: any) {
      this.broadcastStatus('FAILED', undefined, undefined, err.message || 'Worker mengalami kegagalan.');
    } finally {
      this.isRunning = false;
    }
  }

  public cancel(): void {
    this.isRunning = false;
  }

  private broadcastStatus(status: WorkerStatus, progressMessage?: string, data?: any, error?: string): void {
    const msg: WorkerMessage = {
      type: status === 'RUNNING' ? 'WORKER_PROGRESS' : status === 'FAILED' || status === 'TIMEOUT' ? 'WORKER_ERROR' : 'WORKER_RESULT',
      workerId: this.workerId,
      status,
      data: data || progressMessage,
      error
    };
    
    // Broadcast to sidepanel UI and Coordinator via runtime messaging
    chrome.runtime.sendMessage(msg).catch(() => {});
  }
}
