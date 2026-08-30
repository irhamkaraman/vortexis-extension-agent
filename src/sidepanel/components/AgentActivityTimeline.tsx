import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronRight, CircleAlert, LoaderCircle, Camera, MousePointer, Keyboard, ScrollText, Target, Wand2, Eye, AppWindow, Puzzle } from 'lucide-react';
import { AgentActivityState } from '../../core/types/agent';

interface AgentActivityTimelineProps {
  activity: AgentActivityState;
  isExecutingTool?: boolean;
  activeToolName?: string;
  statusText?: string;
  isThinking: boolean;
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  capture_screen: <Camera className="w-3 h-3" />,
  capture_chart_vision: <Camera className="w-3 h-3" />,
  capture_and_inspect_vision: <Eye className="w-3 h-3" />,
  click_coordinate: <MousePointer className="w-3 h-3" />,
  double_click_coordinate: <MousePointer className="w-3 h-3" />,
  type_text: <Keyboard className="w-3 h-3" />,
  type_with_delay: <Keyboard className="w-3 h-3" />,
  scroll_page: <ScrollText className="w-3 h-3" />,
  scroll_and_find: <ScrollText className="w-3 h-3" />,
  scan_dom_elements: <Target className="w-3 h-3" />,
  scan_interactive_tree: <Target className="w-3 h-3" />,
  get_page_context: <Eye className="w-3 h-3" />,
  extract_structured_data: <Wand2 className="w-3 h-3" />,
  drag_and_drop: <MousePointer className="w-3 h-3" />,
  drag_and_drop_element: <MousePointer className="w-3 h-3" />,
  trigger_hotkey: <Keyboard className="w-3 h-3" />,
  trigger_keyboard_shortcut: <Keyboard className="w-3 h-3" />,
  draw_on_chart: <Wand2 className="w-3 h-3" />,
  switch_timeframe: <Target className="w-3 h-3" />,
  fill_order_parameters: <Keyboard className="w-3 h-3" />,
  execute_confirmed_order: <Target className="w-3 h-3" />,
  wait_for_condition: <ScrollText className="w-3 h-3" />,
  inspect_canvas_layers: <Eye className="w-3 h-3" />,
  list_available_tools: <Wand2 className="w-3 h-3" />,
  save_action_macro: <Wand2 className="w-3 h-3" />,
  finish_task: <Check className="w-3 h-3" />,
  request_confirmation: <Target className="w-3 h-3" />,
  request_user_confirmation: <Target className="w-3 h-3" />,
  request_trade_confirmation: <Target className="w-3 h-3" />,
  list_tabs: <AppWindow className="w-3 h-3" />,
  switch_tab: <AppWindow className="w-3 h-3" />,
  list_extensions: <Puzzle className="w-3 h-3" />,
  disable_extension: <Puzzle className="w-3 h-3" />,
};

const TOOL_LABELS: Record<string, string> = {
  capture_screen: 'Mengambil screenshot',
  capture_chart_vision: 'Mengambil screenshot chart',
  capture_and_inspect_vision: 'Menganalisis visual halaman',
  click_coordinate: 'Mengklik elemen',
  double_click_coordinate: 'Mengklik ganda elemen',
  type_text: 'Mengetik teks',
  type_with_delay: 'Mengetik teks',
  scroll_page: 'Menggulir halaman',
  scroll_and_find: 'Mencari elemen',
  scan_dom_elements: 'Memindai elemen DOM',
  scan_interactive_tree: 'Memindai elemen interaktif',
  get_page_context: 'Mengumpulkan konteks halaman',
  extract_structured_data: 'Mengekstrak data',
  drag_and_drop: 'Drag & drop',
  drag_and_drop_element: 'Menggeser elemen',
  trigger_hotkey: 'Shortcut keyboard',
  trigger_keyboard_shortcut: 'Shortcut keyboard',
  draw_on_chart: 'Menggambar pada chart',
  switch_timeframe: 'Mengganti timeframe',
  fill_order_parameters: 'Mengisi parameter order',
  execute_confirmed_order: 'Mengeksekusi order',
  wait_for_condition: 'Menunggu',
  inspect_canvas_layers: 'Memeriksa kanvas',
  list_available_tools: 'Mencari tool',
  save_action_macro: 'Menyimpan workflow',
  finish_task: 'Menyelesaikan',
  request_confirmation: 'Meminta persetujuan',
  request_user_confirmation: 'Meminta persetujuan',
  request_trade_confirmation: 'Konfirmasi order',
  list_tabs: 'Membaca daftar tab',
  switch_tab: 'Beralih tab',
  list_extensions: 'Membaca daftar ekstensi',
  disable_extension: 'Menonaktifkan ekstensi',
};

export const AgentActivityTimeline: React.FC<AgentActivityTimelineProps> = ({
  activity,
  isExecutingTool,
  activeToolName,
  statusText,
  isThinking,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-collapse when all steps complete and thinking is done
  useEffect(() => {
    if (!isThinking && activity.steps.every((s) => s.status !== 'active')) {
      const timer = setTimeout(() => setIsOpen(false), 800);
      return () => clearTimeout(timer);
    }
    // Auto-expand when there are tool steps and thinking
    if (isThinking && activity.steps.some((s) => s.kind === 'tool')) {
      setIsOpen(true);
    }
  }, [isThinking, activity.steps]);

  const toolSteps = activity.steps.filter((s) => s.kind === 'tool');

  // Don't render if no steps and not thinking
  if (toolSteps.length === 0 && !isThinking) return null;

  const completedCount = toolSteps.filter((s) => s.status === 'success').length;
  const errorCount = toolSteps.filter((s) => s.status === 'error').length;
  const activeCount = toolSteps.filter((s) => s.status === 'active').length;

  // Derived status text
  const liveStatus = isExecutingTool && activeToolName
    ? (TOOL_LABELS[activeToolName] || `Menjalankan ${activeToolName}...`)
    : statusText || 'Menganalisis permintaan...';

  return (
    <div className="vortexis-activity-timeline-root">
      {/* Header — clickable to expand/collapse */}
      <button type="button" className="vortexis-activity-timeline-header" onClick={() => setIsOpen((v) => !v)}>
        <div className="vortexis-activity-timeline-title">
          {isThinking ? (
            <LoaderCircle className="w-3 h-3 vortexis-activity-spin text-cyan-400" />
          ) : (
            <Check className="w-3 h-3 text-emerald-400" />
          )}
          <span className="vortexis-activity-timeline-label">
            {isThinking ? 'Thinking' : `Selesai — ${completedCount} langkah`}
          </span>
        </div>
        <div className="vortexis-activity-timeline-meta">
          {errorCount > 0 && <span className="vortexis-activity-badge-error">{errorCount} gagal</span>}
          {toolSteps.length > 0 && <span className="vortexis-activity-badge-count">{completedCount + activeCount}/{toolSteps.length}</span>}
          {isOpen ? <ChevronRight className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
        </div>
      </button>

      {/* Step list — flat list, no timeline dots/circles */}
      {isOpen && (
        <div className="vortexis-activity-timeline-steps">
          {toolSteps.map((step) => {
            const toolIcon = step.toolName ? TOOL_ICONS[step.toolName] : undefined;
            const toolLabel = step.toolName ? (TOOL_LABELS[step.toolName] || step.title) : step.title;

            return (
              <div className={`vortexis-activity-timeline-item is-${step.status}`} key={step.id}>
                <div className="vortexis-activity-timeline-body">
                  <div className="vortexis-activity-timeline-row">
                    <span className="vortexis-activity-timeline-icon">
                      {step.status === 'active' ? (
                        <LoaderCircle className="w-3 h-3 vortexis-activity-spin text-cyan-400" />
                      ) : step.status === 'success' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <CircleAlert className="w-3 h-3 text-red-400" />
                      )}
                    </span>
                    {toolIcon && <span className="vortexis-activity-timeline-icon tool-icon">{toolIcon}</span>}
                    <span className="vortexis-activity-timeline-name">{toolLabel}</span>
                    {step.resultSummary && (
                      <span className="vortexis-activity-timeline-result">{step.resultSummary}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Live executing indicator — flat, no dot */}
          {isThinking && isExecutingTool && activeToolName && (
            <div className="vortexis-activity-timeline-item is-active">
              <div className="vortexis-activity-timeline-body">
                <div className="vortexis-activity-timeline-row">
                  <span className="vortexis-activity-timeline-icon">
                    <LoaderCircle className="w-3 h-3 vortexis-activity-spin text-cyan-400" />
                  </span>
                  <span className="vortexis-activity-timeline-icon tool-icon">
                    {TOOL_ICONS[activeToolName] || <Wand2 className="w-3 h-3" />}
                  </span>
                  <span className="vortexis-activity-timeline-name text-cyan-300">
                    {TOOL_LABELS[activeToolName] || activeToolName}...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
