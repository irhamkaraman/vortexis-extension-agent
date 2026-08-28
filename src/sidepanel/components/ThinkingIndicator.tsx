import React from 'react';
import { Loader2, Terminal } from 'lucide-react';

const THINKING_MESSAGES = [
  'Menganalisis permintaan kamu...',
  'Melihat isi halaman yang aktif...',
  'Memindai elemen interaktif di halaman...',
  'Mengumpulkan konteks dari halaman...',
  'Memutuskan langkah selanjutnya...',
  'Bertindak sesuai instruksi kamu...',
];

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
  isExecutingTool,
  activeToolName,
}) => {
  const derivedStatus = statusText || (activeToolName ? TOOL_STATUS_MESSAGES[activeToolName] || `Menjalankan ${activeToolName}...` : THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)]);

  return (
    <div className="flex flex-col my-2 items-start animate-in fade-in duration-200 w-full max-w-full">
      <div className="flex items-center gap-1.5 mb-1 font-mono text-[9px] text-neutral-500">
        <span className="uppercase font-semibold text-neutral-400">VORTEXIS</span>
        <span>•</span>
        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
          <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-400" strokeWidth={2} />
          <span>{isExecutingTool ? `SEDANG BERTINDAK` : 'BERPIKIR'}</span>
        </span>
      </div>

      <div className="w-full rounded-lg p-3 text-xs bg-gradient-to-br from-neutral-950 to-neutral-900 border border-neutral-800/60 text-neutral-200 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2.5 text-neutral-300 font-sans text-[11px]">
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" strokeWidth={2} />
          <span className="font-medium truncate">{derivedStatus}</span>
        </div>

        {isExecutingTool && (
          <div className="space-y-1.5 pt-1">
            <div className="h-1.5 bg-neutral-800/80 rounded animate-pulse w-3/4"></div>
            <div className="h-1.5 bg-neutral-800/60 rounded animate-pulse w-full" style={{ animationDelay: '0.15s' }}></div>
            <div className="h-1.5 bg-neutral-800/40 rounded animate-pulse w-1/2" style={{ animationDelay: '0.3s' }}></div>
          </div>
        )}

        {thought && (
          <div className="p-2.5 bg-neutral-950/80 rounded-lg border border-neutral-800/60 font-mono text-[10px] text-neutral-400 space-y-1 overflow-hidden">
            <div className="flex items-center gap-1 text-neutral-500 font-bold">
              <Terminal className="w-3 h-3 text-emerald-400 shrink-0" strokeWidth={1.5} />
              <span>REASONING:</span>
            </div>
            <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap break-words">{thought}</p>
          </div>
        )}
      </div>
    </div>
  );
};