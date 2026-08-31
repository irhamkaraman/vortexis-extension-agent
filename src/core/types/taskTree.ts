export type TaskActionType = 'NAVIGATE' | 'CLICK' | 'INPUT' | 'EXTRACT' | 'WAIT' | 'LOGIC';

export interface TaskStep {
  id: string;
  description: string;
  actionType: TaskActionType;
  targetPredict?: string; // CSS Selector, URL, or textual description
  dependencies: string[]; // Array of step ids that must complete before this
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  subSteps?: TaskStep[];
}

export interface TaskPlan {
  id: string;
  originalInstruction: string;
  steps: TaskStep[];
}
