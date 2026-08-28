import React from 'react';
import { Check, ChevronDown, ChevronRight, CircleAlert, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { AgentActivityState } from '../../core/types/agent';

const TOOL_STATUS_MESSAGES: Record<string, string> = {
  capture_screen: 'Mengambil screenshot halaman...',
  capture_chart_vision: 'Mengambil screenshot chart...',
  capture_and_inspect_vision: 'Menganalisis visual halaman...',
  get_page_context: 'Mengumpulkan konteks halaman...',
  extract_structured_data: 'Mengekstrak data terstruktur...',
  scan_dom_elements: 'Memindai elemen DOM...',
  scan_interactive_tree: 'Memindai elemen interaktif...',
  click_coordinate: 'Menggerakkan kursor untuk klik...',
  double_click_coordinate: 'Menggerakkan kursor untuk klik ganda...',
  type_text: 'Mengetik pada form...',
  type_with_delay: 'Mengetik dengan jeda...',
  scroll_page: 'Menggulir halaman...',
  scroll_and_find: 'Mencari elemen sambil menggulir...',
  drag_and_drop: 'Membuat gerakan drag & drop...',
  drag_and_drop_element: 'Menggeser elemen...',
  draw_on_chart: 'Menggambar pada chart...',
  switch_timeframe: 'Mengganti timeframe...',
  fill_order_parameters: 'Mengisi parameter order...',
  execute_confirmed_order: 'Mengeksekusi order yang sudah dikonfirmasi...',
  trigger_hotkey: 'Mengirim shortcut keyboard...',
  trigger_keyboard_shortcut: 'Mengirim shortcut keyboard...',
  wait_for_condition: 'Menunggu kondisi halaman...',
  inspect_canvas_layers: 'Mengecek layer canvas/SVG...',
  request_confirmation: 'Menunggu persetujuan kamu...',
  request_user_confirmation: 'Menunggu konfirmasi...',
  request_trade_confirmation: 'Menunggu konfirmasi trade...',
  save_action_macro: 'Menyimpan macro aksi...',
  finish_task: 'Menyelesaikan tugas...',
};

interface ThinkingIndicatorProps {
  activity: AgentActivityState;
  statusText?: string;
  thought?: string;
  isExecutingTool?: boolean;
  activeToolName?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  activity,
  statusText,
  thought: _thought,
  isExecutingTool: _isExecutingTool,
  activeToolName,
}) => {
  const [thoughtOpen, setThoughtOpen] = useState(true);
  const derivedStatus = statusText || (activeToolName ? TOOL_STATUS_MESSAGES[activeToolName] || `Menjalankan ${activeToolName}...` : 'Menyiapkan jawaban...');

  return (
    <div className="vortexis-live-activity" role="status" aria-live="polite">
      <div className="vortexis-thinking-line">
        <span className="vortexis-thinking-label">{derivedStatus}</span>
        <button type="button" onClick={() => setThoughtOpen((open) => !open)} className="vortexis-thinking-toggle" aria-label="Tampilkan status proses">
           {thoughtOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>
      {thoughtOpen && <div className="vortexis-activity-timeline">
        {activity.steps.map((step) => (
          <div className={`vortexis-activity-step is-${step.status}`} key={step.id}>
            <span className="vortexis-activity-icon">{step.status === 'active' ? <LoaderCircle className="vortexis-activity-spin" /> : step.status === 'success' ? <Check /> : <CircleAlert />}</span>
            <div className="vortexis-activity-copy"><strong>{step.title}</strong><span>{step.summary}</span>{step.parameters && Object.keys(step.parameters).length > 0 && <code>{JSON.stringify(step.parameters, null, 2)}</code>}</div>
          </div>
        ))}
      </div>}
    </div>
  );
};
