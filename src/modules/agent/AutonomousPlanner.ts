import OpenAI from 'openai';
import { BackgroundToolExecutor } from '../../background';
import { ChatMessage, UniversalResponseFormat } from '../../core/types/agent';
import { ActionParser } from './ActionParser';
import { SelfHealingDriver } from './SelfHealingDriver';
import { ToolRegistry } from './ToolRegistry';
import { UNIVERSAL_AGENT_SYSTEM_PROMPT } from '../ai/PromptTemplates';

import type { ChatCompletionContentPartText, ChatCompletionContentPartImage } from 'openai/resources/chat';

const MAX_IMAGE_BASE64_BYTES = 20 * 1024 * 1024;

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
  private hardcodedApiKey: string = 'sk-bYHO7aecKIXDotP3seUUd5jWfQu3e2gs';
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
    onStepUpdate: (message: ChatMessage, extraState?: { isExecutingTool?: boolean; activeToolName?: string; streamingComplete?: boolean }) => void,
    shouldStop: () => boolean,
    onRequireApproval?: (actionDesc: string, onApprove: () => void, onReject: () => void) => void,
    maxIterations: number = 12
  ): Promise<void> {
    const normalizedGoal = userGoal.trim().toLowerCase();
    const isGreeting = /^(hai|halo|hello|hey|hi|pagi|siang|sore|malam)(\s+vortexis)?[!.?\s]*$/i.test(normalizedGoal);
    const asksCapabilities = /(siapa kamu|kamu siapa|apa yang bisa|kemampuan|tools?\b|fitur apa)/i.test(normalizedGoal);

    // Keep trivial conversational turns off the model/tool loop. This removes
    // unnecessary latency and guarantees that casual chat never touches a tab.
    if (isGreeting || asksCapabilities) {
      const reply = isGreeting
        ? 'Hai. Aku VORTEXIS, asisten otomatis di browser kamu. Aku bisa membantu membaca halaman, mengisi form, mengklik elemen, mengambil screenshot, dan mengolah data.'
        : 'Aku VORTEXIS. Kemampuanku mencakup:\n\n• Membaca konteks halaman dengan RAG\n• Screenshot dan analisis visual\n• Scan elemen interaktif\n• Klik dan mengetik pada form\n• Scroll dan drag and drop\n• Shortcut keyboard\n• Ekstraksi data\n• Konfirmasi aksi berisiko';
      onStepUpdate({
        id: `msg-local-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }, { isExecutingTool: false, streamingComplete: true });
      return;
    }

    const imageAttachments = historyMessages
      .filter((m) => m.attachments && m.attachments.length > 0)
      .flatMap((m) => m.attachments!.filter((a) => a.isImage))
      .slice(0, 4);
    let iteration = 0;
    const pageContext = await this.prefetchRelevantPageContext(userGoal, shouldStop);
    const conversationTurns: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      ...historyMessages.map((m) => ({
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
        }, { isExecutingTool: false });

        const turnResponse: UniversalResponseFormat = await this.getSenseNovaDecision(conversationTurns, imageAttachments);

        const fullReplyText = turnResponse.reply || 'Memproses instruksi...';
        let currentText = '';

        for (let i = 0; i < fullReplyText.length; i += 4) {
          if (shouldStop()) break;
          currentText = fullReplyText.substring(0, i + 4);

          onStepUpdate({
            id: stepMsgId,
            role: 'assistant',
            content: currentText,
            thoughtProcess: {
              thought: turnResponse.thought,
              current_observation: turnResponse.thought,
            },
            toolCall: turnResponse.tool_call
              ? { name: turnResponse.tool_call.name, parameters: turnResponse.tool_call.parameters }
              : undefined,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }, { isExecutingTool: false });

          await new Promise((r) => setTimeout(r, 15));
        }

        const finalStepMsg: ChatMessage = {
          id: stepMsgId,
          role: 'assistant',
          content: fullReplyText,
          thoughtProcess: {
            thought: turnResponse.thought,
            current_observation: turnResponse.thought,
          },
          toolCall: turnResponse.tool_call
            ? { name: turnResponse.tool_call.name, parameters: turnResponse.tool_call.parameters }
            : undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        onStepUpdate(finalStepMsg, { isExecutingTool: false, streamingComplete: true });

        if (!turnResponse.tool_call || turnResponse.tool_call.name === 'finish_task') {
          break;
        }

        const toolName = turnResponse.tool_call.name;
        const params = turnResponse.tool_call.parameters;

        onStepUpdate(finalStepMsg, { isExecutingTool: true, activeToolName: toolName });

        if (toolName === 'request_confirmation' || toolName === 'request_user_confirmation') {
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
        onStepUpdate({ ...finalStepMsg }, { isExecutingTool: false, streamingComplete: true });

        conversationTurns.push({ role: 'assistant', content: JSON.stringify(turnResponse) });
        conversationTurns.push({
          role: 'system',
          content: `Hasil eksekusi tool ${toolName}: ${JSON.stringify(toolRes.data || toolRes.error || 'Success')}`,
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

  private getOverlayStatusKey(toolName: string, params: Record<string, any>): string {
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
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[],
    imageAttachments: { content: string; type: string; name: string }[]
  ): Promise<UniversalResponseFormat> {
    try {
      const messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string | Array<ChatCompletionContentPartText | ChatCompletionContentPartImage>;
      }> = [
        { role: 'system', content: UNIVERSAL_AGENT_SYSTEM_PROMPT },
        ...chatHistory,
      ];

      const requestBody: any = {
        model: this.modelName,
        messages,
        temperature: 0.2,
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

      const response = await this.openai.chat.completions.create(requestBody as any);

      const rawContent = response.choices[0]?.message?.content || '';
      return ActionParser.parseUniversalAgentResponse(rawContent);
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      if (errorMsg.includes('image') || errorMsg.includes('vision') || errorMsg.includes('multimodal')) {
        console.error('[AutonomousPlanner] Vision not supported by model:', this.modelName);
        const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
          { role: 'system', content: UNIVERSAL_AGENT_SYSTEM_PROMPT },
          ...chatHistory,
          {
            role: 'system',
            content: `User uploaded ${imageAttachments.length} image file(s) (${imageAttachments.map((a) => a.name).join(', ')}). Note: the model does not support image analysis directly. Please respond to the user's text request and let them know images were received but cannot be visually analyzed.`,
          },
        ];

        const response = await this.openai.chat.completions.create({
          model: this.modelName,
          messages,
          temperature: 0.2,
        });

        const rawContent = response.choices[0]?.message?.content || '';
        return ActionParser.parseUniversalAgentResponse(rawContent);
      }

      console.error('[AutonomousPlanner] SenseNova Decision Error:', err);
      throw new Error(`SenseNova API Error: ${err.message || String(err)}`);
    }
  }
}
