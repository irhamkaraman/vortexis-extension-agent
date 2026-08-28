import OpenAI from 'openai';
import { BackgroundToolExecutor } from '../../background';
import { ChatMessage, SuperAgentToolParams, UniversalResponseFormat } from '../../core/types/agent';
import { ActionParser } from './ActionParser';
import { SelfHealingDriver } from './SelfHealingDriver';
import { ToolRegistry } from './ToolRegistry';
import { UNIVERSAL_AGENT_SYSTEM_PROMPT } from '../ai/PromptTemplates';
import { getNativeToolDefinitions } from './ToolCatalog';

import type { ChatCompletionContentPartText, ChatCompletionContentPartImage } from 'openai/resources/chat';

const MAX_IMAGE_BASE64_BYTES = 20 * 1024 * 1024;
// SenseNova may take over a minute before producing the first SSE chunk.
// Keep streaming enabled while allowing that provider-side cold start.
const STREAM_TIMEOUT_MS = 120_000;
const CASUAL_STREAM_TIMEOUT_MS = 120_000;
const MAX_STREAM_ATTEMPTS = 2;
// Limit conversation history to avoid context overflow on multi-turn calls.
// SenseNova docs: "Multi-turn significantly increases prompt_tokens. For long histories, summarize or truncate."
const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_RESULT_CHARS = 2000;

interface NativeToolCall { id: string; name: string; arguments: string; }
interface NativeDecision { content: string; toolCalls: NativeToolCall[]; reasoningContent: string; }

const OVERLAY_STATUSES: Record<string, string> = {
  capturing: 'Sedang screenshot — halaman tetap bisa diklik',
  scanning: 'Sedang memindai — halaman tetap bisa diklik',
  clicking: 'Sedang mengklik — halaman tetap bisa diklik',
  typing: 'Sedang mengetik — halaman tetap bisa diklik',
  scrolling: 'Sedang scroll — halaman tetap bisa diklik',
  dragging: 'Sedang dragging — halaman tetap bisa diklik',
  planning: 'Sedang menganalisis — halaman tetap bisa diklik',
  default: 'VORTEXIS sedang bekerja — halaman tetap bisa diklik',
};

export class AutonomousPlanner {
  private openai: OpenAI;
  private toolRegistry: ToolRegistry;
  private selfHealingDriver: SelfHealingDriver;
  private toolExecutor: BackgroundToolExecutor;
  private modelName: string = 'sensenova-6.8-flash-lite';
  private hardcodedApiKey: string = 'sk-1aoBmAqJK9qd4Wu9DrhZq3PPoi7RlvQq';
  private baseURL: string = 'https://token.sensenova.ai/v1';
  private overlayEnabled: boolean = false;

  constructor(toolRegistry: ToolRegistry, selfHealingDriver: SelfHealingDriver, toolExecutor: BackgroundToolExecutor) {
    this.toolRegistry = toolRegistry;
    this.selfHealingDriver = selfHealingDriver;
    this.toolExecutor = toolExecutor;
    this.openai = new OpenAI({
      apiKey: this.hardcodedApiKey,
      baseURL: this.baseURL,
      dangerouslyAllowBrowser: true,
    });
  }

  public async runSuperAgentLoop(
    userGoal: string,
    historyMessages: ChatMessage[],
    onStepUpdate: (message: ChatMessage, extraState?: { isExecutingTool?: boolean; activeToolName?: string; statusText?: string; streamingComplete?: boolean }) => void,
    shouldStop: () => boolean,
    onRequireApproval?: (actionDesc: string, onApprove: () => void, onReject: () => void) => void,
    maxIterations: number = 12,
    reasoningEffort: 'none' | 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    const imageAttachments = historyMessages
      .filter((m) => m.attachments && m.attachments.length > 0)
      .flatMap((m) => m.attachments!.filter((a) => a.isImage))
      .slice(0, 4);
    let iteration = 0;
    const pageContext = await this.prefetchRelevantPageContext(userGoal, shouldStop);

    // Trim history to avoid context overflow on subsequent prompts.
    // Keep the first 2 messages (initial context) + last MAX_HISTORY_MESSAGES.
    const trimmedHistory = historyMessages.length > MAX_HISTORY_MESSAGES
      ? [...historyMessages.slice(0, 2), ...historyMessages.slice(-MAX_HISTORY_MESSAGES)]
      : historyMessages;

    const conversationTurns: { role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string }[] = [
      {
        role: 'system',
        content: `PRIMARY USER GOAL: "${userGoal}". Your mission is strictly to accomplish this goal in the fewest steps possible. Stop immediately with your final answer as soon as you have the needed information or completed the action.`,
      },
      ...trimmedHistory.map((m) => ({
        role: m.role,
        content: m.content || (m.toolCall ? `Executed tool: ${m.toolCall.name}` : ''),
      })),
    ];
    if (pageContext) {
      conversationTurns.push({
        role: 'system',
        content: `Konteks RAG halaman sudah tersedia untuk menjawab permintaan ini. Jangan panggil get_page_context lagi kecuali konteks tidak cukup:\n${pageContext}`,
      });
    }

    try {
      while (iteration < maxIterations) {
        if (shouldStop()) {
          onStepUpdate({
            id: `msg-stop-${Date.now()}`,
            role: 'assistant',
            content: 'Eksekusi dihentikan oleh pengguna.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          break;
        }

        iteration++;
        const stepMsgId = `msg-step-${Date.now()}-${iteration}`;

        onStepUpdate({
          id: stepMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }, { isExecutingTool: false, statusText: 'Menganalisis permintaan...' });

        let streamedAnswer = '';
        let streamedThinking = '';
      const turnResponse: UniversalResponseFormat = await this.getSenseNovaDecision(userGoal, conversationTurns, imageAttachments, shouldStop, (statusText) => {
           onStepUpdate({ id: stepMsgId, role: 'assistant', content: '', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, { statusText, isExecutingTool: false });
         }, (partialText) => {
            streamedAnswer = partialText;
            onStepUpdate({ id: stepMsgId, role: 'assistant', content: partialText, thinkingContent: streamedThinking || undefined, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, { isExecutingTool: false });
          }, (partialThought) => {
            streamedThinking = partialThought;
            onStepUpdate({ id: stepMsgId, role: 'assistant', content: streamedAnswer, thinkingContent: partialThought, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, { isExecutingTool: false });
          }, reasoningEffort);

        // A tool-call turn is an internal activity step, not a user-facing answer.
        // Only the no-tool turn becomes the final response bubble.
        const isFinishSignal = turnResponse.tool_call?.name === 'finish_task';
        const fullReplyText = turnResponse.tool_call && !isFinishSignal ? '' : (turnResponse.reply || 'Selesai memproses permintaan.');
        let currentText = streamedAnswer;

        for (let i = streamedAnswer.length; i < fullReplyText.length; i += 4) {
          if (shouldStop()) break;
          currentText = fullReplyText.substring(0, i + 4);

          onStepUpdate({
            id: stepMsgId,
            role: 'assistant',
            content: currentText,
            thinkingContent: streamedThinking || undefined,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }, { isExecutingTool: false });

          await new Promise((r) => setTimeout(r, 15));
        }

        let finalThought = streamedThinking;
        if (!finalThought && turnResponse.thought && turnResponse.thought !== 'Direct response') {
          finalThought = turnResponse.thought;
        }

        const finalStepMsg: ChatMessage = {
          id: stepMsgId,
          role: 'assistant',
          content: fullReplyText,
          toolCall: turnResponse.tool_call ? {
            name: turnResponse.tool_call.name,
            parameters: turnResponse.tool_call.parameters || {},
          } : undefined,
          thinkingContent: finalThought || undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        onStepUpdate(finalStepMsg, {
          isExecutingTool: Boolean(turnResponse.tool_call && !isFinishSignal),
          activeToolName: turnResponse.tool_call && !isFinishSignal ? turnResponse.tool_call.name : undefined,
          statusText: turnResponse.tool_call && !isFinishSignal ? `Menjalankan ${turnResponse.tool_call.name}...` : undefined,
          streamingComplete: !turnResponse.tool_call || isFinishSignal,
        });

        if (!turnResponse.tool_call || turnResponse.tool_call.name === 'finish_task') {
          break;
        }

        const toolName = turnResponse.tool_call.name;
        const params = turnResponse.tool_call.parameters;

        onStepUpdate(finalStepMsg, { isExecutingTool: true, activeToolName: toolName, statusText: 'Menjalankan langkah yang diperlukan...' });

        if (toolName === 'request_confirmation' || toolName === 'request_user_confirmation' || toolName === 'request_trade_confirmation') {
          const details = params.details || params.warning_message || 'Konfirmasi aksi berisiko tinggi diperlukan.';
          await new Promise<void>((resolve, reject) => {
            if (onRequireApproval) {
              onRequireApproval(details, () => resolve(), () => reject(new Error('Aksi dibatalkan oleh pengguna.')));
            } else {
              resolve();
            }
          });
        }

        const overlayKey = this.getOverlayStatusKey(toolName, params);
        try {
          await this.toolExecutor.setOverlayStatus(OVERLAY_STATUSES[overlayKey] || OVERLAY_STATUSES.default);
        } catch { /* overlay not available (e.g., chrome:// page) — continue */ }
        try {
          if (this.requiresOverlay(toolName)) {
            await this.toolExecutor.enableOverlay();
            this.overlayEnabled = true;
          }
        } catch { /* overlay not available — continue without it */ }

        if (toolName === 'capture_screen' || toolName === 'capture_chart_vision' || toolName === 'capture_and_inspect_vision') {
          try {
            await this.toolExecutor.showGrid();
          } catch { /* grid not available — continue without it */ }
        }

        if (toolName === 'click_coordinate') {
          const x = params.x ?? 0;
          const y = params.y ?? 0;
          await this.toolExecutor.moveCursor(x, y, 400);
          await this.toolExecutor.clickAnimation();
          await new Promise((r) => setTimeout(r, 100));
        }

        if (toolName === 'double_click_coordinate') {
          const x = params.x ?? 0;
          const y = params.y ?? 0;
          await this.toolExecutor.moveCursor(x, y, 400);
          await this.toolExecutor.clickAnimation();
          await new Promise((r) => setTimeout(r, 80));
          await this.toolExecutor.clickAnimation();
        }

        if (toolName === 'type_text' || toolName === 'type_with_delay') {
          const tx = params.x ?? 0;
          const ty = params.y ?? 0;
          await this.toolExecutor.moveCursor(tx, ty, 400);
          await new Promise((r) => setTimeout(r, 150));
        }

        // Auto-scan DOM before click to give LLM context for next iteration
        if (toolName === 'click_coordinate' || toolName === 'double_click_coordinate') {
          try {
            const elements = await this.toolExecutor.scanInteractiveTree();
            const summary = elements
              .slice(0, 20)
              .map((e) => `${e.id}:${e.tag}["${e.text || e.id || ''}"]@(${e.x},${e.y})`)
              .join('\n');
            if (summary) {
              conversationTurns.push({
                role: 'system',
                content: `DOM interactive elements (id: tag["text"]@x,y):\n${summary}`,
              });
            }
          } catch {
            // Non-critical — scan may fail on some pages
          }
        }

        const toolRes = await this.selfHealingDriver.executeWithSelfHealing(toolName, params);

        if ((toolName === 'capture_screen' || toolName === 'capture_chart_vision' || toolName === 'capture_and_inspect_vision') && toolRes.success) {
          await this.toolExecutor.hideGrid();
        }

        if (toolRes.requiresApproval && onRequireApproval) {
          await new Promise<void>((resolve, reject) => {
            onRequireApproval(
              toolRes.warningMessage || 'Persetujuan eksekusi diperlukan.',
              () => resolve(),
              () => reject(new Error('Aksi dibatalkan oleh pengguna.'))
            );
          });
        }

        finalStepMsg.toolResult = toolRes;
        onStepUpdate({ ...finalStepMsg }, { isExecutingTool: true, activeToolName: toolName, statusText: 'Memproses hasil langkah...' });

        const nativeToolCallId = turnResponse.nativeToolCallId || `call-${Date.now()}`;
        conversationTurns.push({
          role: 'assistant',
          content: '',
          tool_calls: [{
            id: nativeToolCallId,
            type: 'function',
            function: { name: toolName, arguments: JSON.stringify(params) },
          }],
        } as any);
        // Truncate large tool results (screenshots, page context) to prevent context overflow
        let toolResultContent = JSON.stringify(toolRes.data || toolRes.error || { success: toolRes.success });
        if (toolResultContent.length > MAX_TOOL_RESULT_CHARS) {
          toolResultContent = toolResultContent.substring(0, MAX_TOOL_RESULT_CHARS) + '... [truncated]';
        }
        conversationTurns.push({
          role: 'tool',
          tool_call_id: nativeToolCallId,
          content: toolResultContent,
        });

        await new Promise((r) => setTimeout(r, 300));
      }
      } finally {
        if (this.overlayEnabled) {
          await this.toolExecutor.disableOverlay();
          await this.toolExecutor.removeOverlayStatus();
        }
      }
  }

  private getOverlayStatusKey(toolName: string, _params: SuperAgentToolParams): string {
    if (toolName.startsWith('capture_')) return 'capturing';
    if (toolName.startsWith('scan_')) return 'scanning';
    if (toolName === 'click_coordinate' || toolName === 'double_click_coordinate') return 'clicking';
    if (toolName.startsWith('type_')) return 'typing';
    if (toolName.startsWith('scroll_')) return 'scrolling';
    if (toolName.startsWith('drag_') || toolName === 'draw_on_chart') return 'dragging';
    if (toolName === 'trigger_hotkey' || toolName === 'trigger_keyboard_shortcut') return 'typing';
    if (toolName === 'switch_timeframe') return 'clicking';
    if (toolName === 'fill_order_parameters') return 'typing';
    if (toolName === 'execute_confirmed_order') return 'clicking';
    return 'default';
  }

  private async prefetchRelevantPageContext(userGoal: string, shouldStop: () => boolean): Promise<string | null> {
    if (shouldStop() || !/(halaman|page|website|situs|web|teks|isi|konten|harga|chart|grafik|data di|yang tampil)/i.test(userGoal)) {
      return null;
    }

    try {
      const result = await this.toolRegistry.executeTool('get_page_context', { query: userGoal });
      if (!result.success || !result.data) return null;
      const data = result.data as { title?: string; url?: string; snippet?: string; ragMatches?: string[] };
      const matches = data.ragMatches?.filter(Boolean).join('\n\n') || data.snippet || '';
      return matches ? `Judul: ${data.title || 'Tanpa judul'}\nURL: ${data.url || 'Tidak tersedia'}\n${matches.substring(0, 2400)}` : null;
    } catch {
      return null;
    }
  }

  private requiresOverlay(toolName: string): boolean {
    const needsOverlay = [
      'capture_screen', 'capture_chart_vision', 'capture_and_inspect_vision',
      'click_coordinate', 'double_click_coordinate',
      'type_text', 'type_with_delay',
      'scroll_page', 'scroll_and_find',
      'drag_and_drop', 'drag_and_drop_element',
      'draw_on_chart', 'switch_timeframe',
      'fill_order_parameters', 'execute_confirmed_order',
      'trigger_hotkey', 'trigger_keyboard_shortcut',
    ];
    return needsOverlay.includes(toolName);
  }

  private async getSenseNovaDecision(
    userGoal: string,
    chatHistory: { role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string }[],
    imageAttachments: { content: string; type: string; name: string }[],
    shouldStop: () => boolean,
    onStreamStatus?: (statusText: string) => void,
    onStreamText?: (partialText: string) => void,
    onStreamThought?: (thoughtText: string) => void,
    reasoningEffort: 'none' | 'low' | 'medium' | 'high' = 'medium',
  ): Promise<UniversalResponseFormat> {
    // Always provide tools to SenseNova
    const requestTimeout = STREAM_TIMEOUT_MS;
    try {
      const messages: Array<any> = [
        { role: 'system', content: UNIVERSAL_AGENT_SYSTEM_PROMPT },
        ...chatHistory,
      ];

      const requestBody: any = {
        model: this.modelName,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
        reasoning_effort: reasoningEffort,
        tools: getNativeToolDefinitions(),
        tool_choice: 'auto',
      };

      if (imageAttachments.length > 0) {
        const imageContent: Array<ChatCompletionContentPartText | ChatCompletionContentPartImage> = [
          {
            type: 'text',
            text: `User uploaded ${imageAttachments.length} image(s): ${imageAttachments.map((a) => a.name).join(', ')}. Analyze the image(s) carefully.`,
          },
        ];

        for (const img of imageAttachments) {
          if (img.content.length > MAX_IMAGE_BASE64_BYTES) {
            imageContent.push({
              type: 'text',
              text: `[Image too large to process: ${img.name}]`,
            });
            continue;
          }
          imageContent.push({
            type: 'image_url',
            image_url: {
              url: img.content,
              detail: 'high',
            },
          });
        }

        requestBody.messages.push({
          role: 'user',
          content: imageContent,
        });
      }

      const abortController = new AbortController();
       const timeoutId = setTimeout(() => abortController.abort(), requestTimeout);
      const stopPollId = setInterval(() => {
        if (shouldStop()) abortController.abort();
      }, 250);
      requestBody.stream = true;
      onStreamStatus?.('Menerima respons AI...');
      try {
        const response = await Promise.race<Response>([
          this.fetchSenseNovaStreamWithRetry(requestBody, abortController.signal, requestTimeout, MAX_STREAM_ATTEMPTS, onStreamStatus),
          this.rejectAfter(requestTimeout, 'Stream AI timeout sebelum menerima respons.'),
        ]);
        const nativeResponse = await Promise.race<NativeDecision>([
           this.collectSseResponse(response, shouldStop, abortController, onStreamStatus, onStreamText, onStreamThought),
           this.rejectAfter(requestTimeout, 'Stream AI timeout saat membaca delta.'),
        ]);
        if (nativeResponse.toolCalls.length > 0) {
          const toolCall = nativeResponse.toolCalls[0];
          let parameters: SuperAgentToolParams = {};
          try { parameters = JSON.parse(toolCall.arguments || '{}') as SuperAgentToolParams; } catch { /* malformed args are handled by the executor */ }
          return {
            thought: 'Memilih aksi yang diperlukan.',
            plan_step: 'Menjalankan aksi browser.',
            tool_call: { name: toolCall.name as any, parameters },
            reply: '',
            nativeToolCallId: toolCall.id,
          };
        }
        const parsedResponse = ActionParser.parseUniversalAgentResponse(nativeResponse.content);
        if (!parsedResponse.tool_call && nativeResponse.reasoningContent) {
          // If the model intended to use a tool in its reasoning but didn't output native tool_call, try resolving from reasoning
          const fallbackWithReasoning = ActionParser.parseUniversalAgentResponse(`${nativeResponse.reasoningContent}\n${nativeResponse.content}`);
          if (fallbackWithReasoning.tool_call) {
            return {
              ...fallbackWithReasoning,
              reply: parsedResponse.reply,
            };
          }
        }
        return parsedResponse;
      } finally {
        clearTimeout(timeoutId);
        clearInterval(stopPollId);
      }
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      if (shouldStop()) throw new Error('Eksekusi dihentikan oleh pengguna.');
      if (errorMsg.includes('aborted') || errorMsg.includes('abort') || errorMsg.includes('timeout')) {
        onStreamStatus?.('SenseNova tidak merespons.');
        throw new Error(`SenseNova tidak merespons dalam ${Math.round(requestTimeout / 1000)} detik. Periksa koneksi internet, status endpoint, atau API key.`);
      }
      if (errorMsg.includes('image') || errorMsg.includes('vision') || errorMsg.includes('multimodal')) {
        console.error('[AutonomousPlanner] Vision not supported by model:', this.modelName);
        const messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string }> = [
          { role: 'system', content: UNIVERSAL_AGENT_SYSTEM_PROMPT },
          ...chatHistory,
          {
            role: 'system',
            content: `User uploaded ${imageAttachments.length} image file(s) (${imageAttachments.map((a) => a.name).join(', ')}). Note: the model does not support image analysis directly. Please respond to the user's text request and let them know images were received but cannot be visually analyzed.`,
          },
        ];

        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          messages: messages as any,
          temperature: 0.2,
        });

        const rawContent = response.choices[0]?.message?.content || '';
        return ActionParser.parseUniversalAgentResponse(rawContent);
      }

      console.error('[AutonomousPlanner] SenseNova Decision Error:', err);
      throw new Error(`SenseNova API Error: ${err.message || String(err)}`);
    }
  }

  private isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
    return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
  }

  private async fetchSenseNovaStream(body: Record<string, unknown>, signal: AbortSignal): Promise<Response> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.hardcodedApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`SenseNova HTTP ${response.status}: ${errorBody.slice(0, 240)}`);
    }
    if (!response.body) throw new Error('SenseNova tidak mengembalikan stream body.');
    return response;
  }

  private async fetchSenseNovaStreamWithRetry(
    body: Record<string, unknown>,
    signal: AbortSignal,
    timeoutMs: number,
    maxAttempts: number,
    onStreamStatus?: (statusText: string) => void,
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (signal.aborted) throw new Error('Eksekusi dihentikan oleh pengguna.');
      const attemptController = new AbortController();
      const relayAbort = () => attemptController.abort();
      signal.addEventListener('abort', relayAbort, { once: true });
      const timer = window.setTimeout(() => attemptController.abort(), timeoutMs);
      try {
        return await this.fetchSenseNovaStream(body, attemptController.signal);
      } catch (error) {
        lastError = error;
        if (signal.aborted || attempt === maxAttempts) throw error;
        onStreamStatus?.('SenseNova belum merespons — mencoba lagi...');
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      } finally {
        window.clearTimeout(timer);
        signal.removeEventListener('abort', relayAbort);
      }
    }
    throw lastError instanceof Error ? lastError : new Error('SenseNova stream gagal.');
  }

  private async collectSseResponse(
    response: Response,
    shouldStop: () => boolean,
    abortController: AbortController,
    onStreamStatus?: (statusText: string) => void,
    onStreamText?: (partialText: string) => void,
    onStreamThought?: (thoughtText: string) => void,
  ): Promise<NativeDecision> {
    if (!response.body) throw new Error('SenseNova stream body kosong.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let reasoningContent = '';
    const toolCalls = new Map<number, NativeToolCall>();
    const consume = (payload: string) => {
      if (!payload || payload === '[DONE]') return;
      let chunk: any;
      try { chunk = JSON.parse(payload); } catch { return; }
      const delta = chunk.choices?.[0]?.delta;
      const text = delta?.content || '';
      content += text;
      // Capture reasoning — SenseNova streaming uses "reasoning" field in SSE delta
      // Some endpoints may use "reasoning_content" — check both for compatibility
      const reasoning = delta?.reasoning || delta?.reasoning_content || '';
      if (reasoning) {
        reasoningContent += reasoning;
        onStreamThought?.(reasoningContent);
        onStreamStatus?.('Sedang berpikir...');
      }
      if (text && !content.trimStart().startsWith('{') && !content.includes('```json')) {
        // Strip hallucinated tool call tags from live text stream
        const cleanedContent = content
          .replace(/<[a-zA-Z0-9_=-]+>[\s\S]*?<\/[a-zA-Z0-9_=-]+>/gi, '')
          .replace(/<[a-zA-Z0-9_=-]+>/gi, '')
          .replace(/<\/[a-zA-Z0-9_=-]+>/gi, '')
          .replace(/(?:tool_call|function_calls|function|action)[\s:=]+[a-zA-Z0-9_]+/gi, '')
          .trim();
        onStreamText?.(cleanedContent);
      }
      for (const call of delta?.tool_calls || []) {
        const index = call.index || 0;
        const current = toolCalls.get(index) || { id: '', name: '', arguments: '' };
        current.id += call.id || '';
        current.name += call.function?.name || '';
        current.arguments += call.function?.arguments || '';
        toolCalls.set(index, current);
        onStreamStatus?.('Menyiapkan langkah yang diperlukan...');
      }
    };
    while (true) {
      if (shouldStop()) { abortController.abort(); throw new Error('Eksekusi dihentikan oleh pengguna.'); }
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) if (line.startsWith('data:')) consume(line.slice(5).trim());
    }
    if (buffer.startsWith('data:')) consume(buffer.slice(5).trim());
    return { content, toolCalls: [...toolCalls.values()], reasoningContent };
  }

  private requestNeedsBrowserTools(userGoal: string): boolean {
    return /(halaman|page|website|situs|web|browser|tab|klik|click|ketik|isi|form|scroll|gulir|screenshot|capture|scan|cari di|ambil|ekstrak|rangkum isi|chart|grafik|canvas|shortcut|drag|order|trade|timeframe|macro|tool)/i.test(userGoal);
  }

  private async collectResponseContent(
    response: { choices: Array<{ message: { content?: string | null } }> } | AsyncIterable<{ choices?: Array<{ delta?: { content?: string | null } }> }>,
    shouldStop: () => boolean,
    abortController: AbortController,
     onStreamStatus?: (statusText: string) => void,
     onStreamText?: (partialText: string) => void,
  ): Promise<NativeDecision> {
    if (!this.isAsyncIterable(response)) {
      const message = response.choices[0]?.message as { content?: string | null; tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> };
      return {
        content: message.content || '',
        toolCalls: (message.tool_calls || []).map((call) => ({ id: call.id || crypto.randomUUID(), name: call.function?.name || '', arguments: call.function?.arguments || '{}' })),
        reasoningContent: '',
      };
    }
    let content = '';
    const toolCalls = new Map<number, NativeToolCall>();
    for await (const chunk of response) {
      if (shouldStop()) {
        abortController.abort();
        throw new Error('Eksekusi dihentikan oleh pengguna.');
      }
      const delta = chunk.choices?.[0]?.delta?.content || '';
      content += delta;
      // SenseNova streams normal answer text in delta.content. Never stream
      // JSON/tool arguments: those are withheld until the native call is complete.
      if (delta && !content.trimStart().startsWith('{') && !content.includes('```json')) {
        onStreamText?.(content);
      }
      const deltas = (chunk.choices?.[0]?.delta as { tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }> } | undefined)?.tool_calls || [];
      for (const call of deltas) {
        const index = call.index || 0;
        const current = toolCalls.get(index) || { id: '', name: '', arguments: '' };
        current.id += call.id || '';
        current.name += call.function?.name || '';
        current.arguments += call.function?.arguments || '';
        toolCalls.set(index, current);
        if (current.name) onStreamStatus?.('Menyiapkan langkah yang diperlukan...');
      }
      if (content.length % 80 < delta.length) onStreamStatus?.('Menyiapkan jawaban...');
    }
    return { content, toolCalls: [...toolCalls.values()], reasoningContent: '' };
  }

  private rejectAfter<T>(milliseconds: number, message: string): Promise<T> {
    return new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), milliseconds);
    });
  }
}
