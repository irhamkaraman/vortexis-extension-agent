import React from 'react';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

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
  statusText?: string;
  thought?: string;
  isExecutingTool?: boolean;
  activeToolName?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  statusText,
  thought,
  isExecutingTool: _isExecutingTool,
  activeToolName,
}) => {
  const [thoughtOpen, setThoughtOpen] = useState(false);
  const derivedStatus = statusText || (activeToolName ? TOOL_STATUS_MESSAGES[activeToolName] || `Menjalankan ${activeToolName}...` : 'Menyiapkan jawaban...');

  return (
    <div className="vortexis-live-activity my-2 w-full max-w-full animate-in fade-in duration-200">
      <div className="vortexis-live-status">
        <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" strokeWidth={2} />
        <span className="truncate">{derivedStatus}</span>
        {thought && <button type="button" onClick={() => setThoughtOpen((open) => !open)} className="ml-auto text-neutral-500 hover:text-neutral-200" aria-label="Tampilkan proses berpikir">
          {thoughtOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>}
      </div>
      {thoughtOpen && thought && thought !== 'Direct response' && <div className="vortexis-live-thought">{thought}</div>}
    </div>
  );
};
