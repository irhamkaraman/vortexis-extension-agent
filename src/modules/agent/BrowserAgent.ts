import { IDOMExecutor } from '../../core/ports/IDOMExecutor';
import { ILanguageModel } from '../../core/ports/ILanguageModel';
import { IVectorStore } from '../../core/ports/IVectorStore';
import { ActionStep, AgentExecutionLog, AgentGoalPlan, AgentStatus } from '../../core/types/agent';
import { DOMElementInfo } from '../../core/types/messages';
import { ActionStepSchema } from './ActionParser';

export class BrowserAgent {
  private llm: ILanguageModel;
  private ragStore: IVectorStore;
  private domExecutor: IDOMExecutor;

  private status: AgentStatus = 'idle';
  private currentPlan?: AgentGoalPlan;
  private logs: AgentExecutionLog[] = [];
  private summaryResult: string = '';
  private onStateChangeCallback?: (status: AgentStatus, log: AgentExecutionLog) => void;

  constructor(llm: ILanguageModel, ragStore: IVectorStore, domExecutor: IDOMExecutor) {
    this.llm = llm;
    this.ragStore = ragStore;
    this.domExecutor = domExecutor;
  }

  public setOnStateChange(cb: (status: AgentStatus, log: AgentExecutionLog) => void): void {
    this.onStateChangeCallback = cb;
  }

  public getStatus(): AgentStatus {
    return this.status;
  }

  public getLogs(): AgentExecutionLog[] {
    return this.logs;
  }

  public getCurrentPlan(): AgentGoalPlan | undefined {
    return this.currentPlan;
  }

  public getSummaryResult(): string {
    return this.summaryResult;
  }

  public async runGoal(goal: string, targetTabId?: number): Promise<void> {
    this.status = 'analyzing';
    this.summaryResult = '';
    this.addLog('info', `Initiating autonomous workflow for goal: "${goal}"`);

    try {
      // Step 1: Scrape active DOM
      this.addLog('info', 'Scraping DOM interactive element hierarchy...');
      const domData = await this.domExecutor.scrapeDOM(targetTabId);

      // Step 2: Auto ingest tab into RAG store
      this.addLog('info', 'Querying in-memory RAG context store...');
      await this.ragStore.ingestDocument({
        url: domData.url,
        title: domData.title,
        text: domData.cleanText,
      });

      const ragResults = await this.ragStore.query(goal, 3);
      const ragContextText = ragResults.map((r) => r.chunk.text).join('\n---\n');

      const domContextText = domData.elements
        .slice(0, 40)
        .map(
          (el: DOMElementInfo) =>
            `[${el.tagName}] selector="${el.selector}" text="${el.text}" placeholder="${el.placeholder || ''}" role="${
              el.role || ''
            }"`
        )
        .join('\n');

      // Step 3: Plan execution via SenseNova LLM
      this.setStatus('planning');
      this.addLog('info', 'Synthesizing action plan using SenseNova LLM...');

      const structuredPlan = await this.llm.generateStructuredPlan(goal, domContextText, ragContextText);

      const actionSteps: ActionStep[] = structuredPlan.steps.map((s: ActionStepSchema) => ({
        id: s.id || `step-${Math.random().toString(36).substring(2, 7)}`,
        type: s.type,
        selector: s.selector,
        value: s.value,
        url: s.url,
        description: s.description,
        thoughtProcess: s.thoughtProcess,
        status: 'pending',
      }));

      this.currentPlan = {
        goal,
        summary: structuredPlan.summary,
        steps: actionSteps,
        currentStepIndex: 0,
      };

      this.addLog('success', `Plan generated successfully: ${structuredPlan.steps.length} steps planned.`);

      // Step 4: Execute actions loop with step-by-step delays for visual feedback
      this.setStatus('executing');
      const extractedInformation: string[] = [];

      for (let i = 0; i < actionSteps.length; i++) {
        if (!this.currentPlan) break;
        this.currentPlan.currentStepIndex = i;
        const step = actionSteps[i];

        step.status = 'running';
        this.addLog('info', `Executing Step ${i + 1}/${actionSteps.length}: [${step.type}] ${step.description}`);

        if (step.selector) {
          await this.domExecutor.highlightElement(step.selector, targetTabId);
          await new Promise((r) => setTimeout(r, 1000));
        }

        const res = await this.domExecutor.executeAction(step, targetTabId);

        await new Promise((r) => setTimeout(r, 800));

        if (step.selector) {
          await this.domExecutor.clearHighlight(targetTabId);
        }

        if (res.success) {
          step.status = 'success';
          if (res.result) {
            extractedInformation.push(`Step ${i + 1} (${step.type}): ${res.result}`);
          }
          this.addLog('success', `Step ${i + 1} Succeeded: ${res.result || 'Done'}`);
        } else {
          step.status = 'failed';
          step.error = res.error;
          this.addLog('error', `Step ${i + 1} Failed: ${res.error}`);
          this.setStatus('failed');
          return;
        }
      }

      this.setStatus('completed');
      this.addLog('success', 'Autonomous goal execution and page analysis finished successfully!');
    } catch (err: any) {
      this.setStatus('failed');
      const msg = err instanceof Error ? err.message : String(err);
      this.addLog('error', `Autonomous agent execution failed: ${msg}`);
    }
  }

  private setStatus(newStatus: AgentStatus): void {
    this.status = newStatus;
  }

  private addLog(level: AgentExecutionLog['level'], message: string, details?: Record<string, unknown>): void {
    const log: AgentExecutionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      details,
    };
    this.logs.push(log);
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.status, log);
    }
  }
}
