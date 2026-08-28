import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Terminal, XCircle, Camera, MousePointer2, Type, ArrowDown, Scan } from 'lucide-react';
import { ToolResult } from '../../core/types/agent';

interface StealthLogCardProps {
  toolName?: string;
  parameters?: Record<string, any>;
  result?: ToolResult;
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  capture_screen: <Camera className="w-3.5 h-3.5 text-sky-400 shrink-0" strokeWidth={1.5} />,
  capture_chart_vision: <Camera className="w-3.5 h-3.5 text-sky-400 shrink-0" strokeWidth={1.5} />,
  click_coordinate: <MousePointer2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.5} />,
  double_click_coordinate: <MousePointer2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.5} />,
  type_text: <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={1.5} />,
  type_with_delay: <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={1.5} />,
  scroll_page: <ArrowDown className="w-3.5 h-3.5 text-purple-400 shrink-0" strokeWidth={1.5} />,
  scroll_and_find: <ArrowDown className="w-3.5 h-3.5 text-purple-400 shrink-0" strokeWidth={1.5} />,
  drag_and_drop: <MousePointer2 className="w-3.5 h-3.5 text-orange-400 shrink-0" strokeWidth={1.5} />,
  scan_dom_elements: <Scan className="w-3.5 h-3.5 text-cyan-400 shrink-0" strokeWidth={1.5} />,
  scan_interactive_tree: <Scan className="w-3.5 h-3.5 text-cyan-400 shrink-0" strokeWidth={1.5} />,
  get_page_context: <Terminal className="w-3.5 h-3.5 text-neutral-400 shrink-0" strokeWidth={1.5} />,
  extract_structured_data: <Terminal className="w-3.5 h-3.5 text-neutral-400 shrink-0" strokeWidth={1.5} />,
  trigger_hotkey: <Type className="w-3.5 h-3.5 text-rose-400 shrink-0" strokeWidth={1.5} />,
  trigger_keyboard_shortcut: <Type className="w-3.5 h-3.5 text-rose-400 shrink-0" strokeWidth={1.5} />,
  draw_on_chart: <MousePointer2 className="w-3.5 h-3.5 text-orange-400 shrink-0" strokeWidth={1.5} />,
  switch_timeframe: <MousePointer2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.5} />,
  fill_order_parameters: <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={1.5} />,
  execute_confirmed_order: <MousePointer2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.5} />,
  finish_task: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.5} />,
};

const TOOL_LABELS: Record<string, string> = {
  list_available_tools: 'Daftar Kemampuan',
  capture_screen: 'Screenshot Halaman',
  capture_chart_vision: 'Screenshot Chart',
  capture_and_inspect_vision: 'Analisis Visual',
  click_coordinate: 'Klik Tombol',
  double_click_coordinate: 'Klik Ganda',
  type_text: 'Mengetik',
  type_with_delay: 'Mengetik dengan Jeda',
  scroll_page: 'Scroll',
  scroll_and_find: 'Scroll & Cari',
  drag_and_drop: 'Drag & Drop',
  drag_and_drop_element: 'Geser Elemen',
  draw_on_chart: 'Gambar pada Chart',
  switch_timeframe: 'Ganti Timeframe',
  fill_order_parameters: 'Isi Form Order',
  execute_confirmed_order: 'Eksekusi Order',
  scan_dom_elements: 'Scan Elemen DOM',
  scan_interactive_tree: 'Scan Elemen Interaktif',
  get_page_context: 'Ambil Konteks Halaman',
  extract_structured_data: 'Eksrak Data',
  trigger_hotkey: 'Kirim Shortcut',
  trigger_keyboard_shortcut: 'Kirim Shortcut',
  wait_for_condition: 'Tunggu Kondisi',
  inspect_canvas_layers: 'Cek Canvas Layer',
  request_confirmation: 'Tunggu Konfirmasi',
  request_user_confirmation: 'Tunggu Konfirmasi',
  request_trade_confirmation: 'Konfirmasi Trade',
  save_action_macro: 'Simpan Macro',
  finish_task: 'Selesai',
};

function formatResultText(toolName: string, result: ToolResult): string {
  if (result.error) return result.error;

  if (toolName === 'list_available_tools') {
    const tools = Array.isArray(result.data?.tools) ? result.data.tools : [];
    return tools.length ? `${tools.length} kemampuan VORTEXIS tersedia.` : 'Daftar kemampuan berhasil dimuat.';
  }

  if (toolName === 'capture_screen' || toolName === 'capture_chart_vision') {
    return 'Berhasil mengambil screenshot halaman.';
  }

  if (toolName === 'scan_dom_elements' || toolName === 'scan_interactive_tree') {
    const count = result.data?.count || 0;
    return `Ditemukan ${count} elemen interaktif pada halaman.`;
  }

  if (toolName === 'click_coordinate') {
    const x = result.data?.x ?? result.data?.x_click ?? 0;
    const y = result.data?.y ?? result.data?.y_click ?? 0;
    return x || y ? `Klik berhasil pada posisi (${x}, ${y}).` : 'Klik berhasil pada target.';
  }

  if (toolName === 'double_click_coordinate') {
    return 'Klik ganda berhasil pada target.';
  }

  if (toolName === 'type_text' || toolName === 'type_with_delay') {
    const text = result.data?.text ?? result.data?.value ?? '';
    return text ? `Berhasil mengetik "${text.length > 40 ? text.substring(0, 40) + '...' : text}" pada form.` : 'Berhasil mengetik pada form.';
  }

  if (toolName === 'scroll_page' || toolName === 'scroll_and_find') {
    const direction = result.data?.direction ?? 'down';
    const amount = result.data?.amount ?? 500;
    return `Berhasil scroll ke ${direction === 'down' ? 'bawah' : 'atas'} sebesar ${amount}px.`;
  }

  if (toolName === 'drag_and_drop' || toolName === 'drag_and_drop_element') {
    return 'Gerakan drag & drop berhasil.';
  }

  if (toolName === 'draw_on_chart') {
    return 'Garis trendline berhasil digambar pada chart.';
  }

  if (toolName === 'switch_timeframe') {
    return `Timeframe berhasil diubah.`;
  }

  if (toolName === 'fill_order_parameters') {
    return 'Parameter order berhasil diisi.';
  }

  if (toolName === 'execute_confirmed_order') {
    return 'Order berhasil dikirim ke broker.';
  }

  if (toolName === 'trigger_hotkey' || toolName === 'trigger_keyboard_shortcut') {
    return 'Shortcut keyboard berhasil dikirim.';
  }

  if (toolName === 'get_page_context' || toolName === 'extract_structured_data') {
    const title = result.data?.title || '';
    const snippet = result.data?.snippet || '';
    return title ? `Halaman "${title.substring(0, 50)}" berhasil diambil konteksnya.` : 'Konteks halaman berhasil diambil.';
  }

  if (toolName === 'finish_task') {
    return 'Tugas berhasil diselesaikan!';
  }

  if (typeof result.data === 'string') return result.data;
  return JSON.stringify(result.data, null, 2);
}

export const StealthLogCard: React.FC<StealthLogCardProps> = ({ toolName, parameters, result }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  if (!toolName) return null;

  const label = TOOL_LABELS[toolName] || toolName;
  const icon = TOOL_ICONS[toolName] || <Terminal className="w-3.5 h-3.5 text-neutral-400 shrink-0" strokeWidth={1.5} />;
  const friendlyText = result ? formatResultText(toolName, result) : '';
  const isSuccess = result?.success;
  const hasError = result?.error;

  return (
    <div className="my-2.5 w-full max-w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="vortexis-stealth-log-toggle w-full flex items-center justify-between text-neutral-400 hover:text-neutral-200 transition-colors p-1 text-xs"
      >
        <span className="flex items-center gap-2 truncate">
          {icon}
          <span className="font-medium text-neutral-200 truncate">{label}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {isSuccess && !hasError && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 stroke-2" />}
          {hasError && <XCircle className="w-3.5 h-3.5 text-red-400 stroke-2" />}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 stroke-2" /> : <ChevronRight className="w-3.5 h-3.5 stroke-2" />}
        </span>
      </button>

      {friendlyText && !isOpen && (
        <div className={`mt-1.5 ml-4 text-[11px] leading-relaxed font-sans ${hasError ? 'text-red-400' : 'text-neutral-300'}`}>
          {friendlyText}
        </div>
      )}

      {isOpen && (
        <div className="mt-2 pt-2 border-t border-neutral-800/60 space-y-2">
          {parameters && Object.keys(parameters).length > 0 && (
            <div className="vortexis-stealth-log-details p-1 text-[10px] text-neutral-400 overflow-x-auto">
              <span className="text-neutral-500 font-bold block mb-0.5">PARAMETRES:</span>
              <pre className="whitespace-pre-wrap font-mono break-all">{JSON.stringify(parameters, null, 2)}</pre>
            </div>
          )}

          {result && (
            <div className="vortexis-stealth-log-details p-1 text-[10px] space-y-1">
              <div className="flex items-center gap-1.5">
                {result.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={1.5} />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" strokeWidth={1.5} />
                )}
                <span className={result.success ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {result.success ? 'BERHASIL' : 'GAGAL'}
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-neutral-300 break-words leading-relaxed max-h-60 overflow-y-auto">
                {result.error || (typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2))}
              </pre>
            </div>
          )}

          {result?.screenshotUrl && (
            <div className="mt-2">
              <span className="text-[10px] text-neutral-500 block mb-1 font-sans">VISUAL SNAPSHOT:</span>
              <img
                src={result.screenshotUrl}
                alt="Snapshot"
                onClick={() => setModalImage(result.screenshotUrl || null)}
                className="w-full max-h-40 object-cover rounded-md border border-neutral-800 cursor-pointer hover:border-neutral-600 transition-colors"
              />
            </div>
          )}
        </div>
      )}

      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={modalImage} alt="Snapshot" className="max-w-full max-h-full rounded border border-neutral-800" />
        </div>
      )}
    </div>
  );
};
