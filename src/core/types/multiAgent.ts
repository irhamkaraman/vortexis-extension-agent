export type WorkerStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

export interface SwarmTask {
  id: string;
  workerId: string;
  domain: string;
  url: string;
  instruction: string;
  status: WorkerStatus;
  progressMessage?: string;
  result?: any;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface CoordinatorMessage {
  type: 'ASSIGN_TASK' | 'CANCEL_TASK';
  workerId: string;
  tabId: number;
  payload: {
    instruction: string;
    url: string;
  };
}

export interface WorkerMessage {
  type: 'WORKER_PROGRESS' | 'WORKER_RESULT' | 'WORKER_ERROR';
  workerId: string;
  status: WorkerStatus;
  data?: any;
  error?: string;
}
