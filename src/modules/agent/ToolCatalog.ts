import { ToolName } from '../../core/types/agent';
import { PluginRegistry } from '../../plugins/core/PluginRegistry';

export interface ToolDefinition {
  name: ToolName;
  label: string;
  description: string;
  whenToUse: string;
  category: 'context' | 'vision' | 'interaction' | 'safety' | 'workflow';
  requiresPage: boolean;
  parameters?: NativeToolDefinition['function']['parameters'];
}

export interface NativeToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string }>;
      additionalProperties: boolean;
    };
  };
}

export const TOOL_CATALOG: ToolDefinition[] = [
  { name: 'list_available_tools', label: 'Daftar kemampuan', description: 'Menampilkan kemampuan VORTEXIS.', whenToUse: 'Saat pengguna menanyakan fitur atau tools.', category: 'workflow', requiresPage: false },
  { name: 'get_page_context', label: 'Konteks halaman', description: 'Membaca isi halaman dan menyimpannya ke RAG.', whenToUse: 'Saat pengguna bertanya tentang halaman yang sedang terbuka.', category: 'context', requiresPage: true },
  { name: 'extract_structured_data', label: 'Ekstraksi data', description: 'Mengambil teks dan data terstruktur dari halaman.', whenToUse: 'Saat pengguna meminta data dari halaman.', category: 'context', requiresPage: true },
  { name: 'capture_screen', label: 'Screenshot', description: 'Mengambil screenshot tab aktif.', whenToUse: 'Saat analisis visual diperlukan.', category: 'vision', requiresPage: true },
  { name: 'capture_chart_vision', label: 'Analisis chart', description: 'Mengambil visual chart untuk analisis.', whenToUse: 'Saat pengguna meminta analisis chart.', category: 'vision', requiresPage: true },
  { name: 'capture_and_inspect_vision', label: 'Inspeksi visual', description: 'Mengambil dan memeriksa visual halaman.', whenToUse: 'Saat teks halaman tidak cukup untuk menjawab.', category: 'vision', requiresPage: true },
  { name: 'scan_dom_elements', label: 'Scan DOM', description: 'Menemukan elemen interaktif dan koordinatnya.', whenToUse: 'Sebelum klik atau saat pengguna meminta daftar elemen.', category: 'interaction', requiresPage: true },
  { name: 'scan_interactive_tree', label: 'Pohon interaktif', description: 'Membaca tombol, link, input, dan selector.', whenToUse: 'Saat perlu target interaksi yang presisi.', category: 'interaction', requiresPage: true },
  { name: 'click_coordinate', label: 'Klik elemen', description: 'Mengklik target berdasarkan koordinat atau selector.', whenToUse: 'Saat pengguna meminta klik.', category: 'interaction', requiresPage: true },
  { name: 'double_click_coordinate', label: 'Klik ganda', description: 'Mengklik target dua kali.', whenToUse: 'Saat pengguna meminta double click.', category: 'interaction', requiresPage: true },
  { name: 'type_text', label: 'Mengetik', description: 'Mengisi input dengan teks.', whenToUse: 'Saat pengguna meminta pengisian form.', category: 'interaction', requiresPage: true },
  { name: 'type_with_delay', label: 'Mengetik bertahap', description: 'Mengisi input dengan jeda antar karakter.', whenToUse: 'Saat input membutuhkan simulasi pengetikan.', category: 'interaction', requiresPage: true },
  { name: 'scroll_page', label: 'Scroll halaman', description: 'Menggulir halaman.', whenToUse: 'Saat pengguna meminta scroll atau target belum terlihat.', category: 'interaction', requiresPage: true },
  { name: 'scroll_and_find', label: 'Scroll dan cari', description: 'Menggulir halaman untuk menemukan target.', whenToUse: 'Saat target perlu dicari sambil scroll.', category: 'interaction', requiresPage: true },
  { name: 'drag_and_drop', label: 'Drag and drop', description: 'Menggeser elemen antar koordinat.', whenToUse: 'Saat pengguna meminta drag.', category: 'interaction', requiresPage: true },
  { name: 'drag_and_drop_element', label: 'Geser elemen', description: 'Menggeser elemen halaman.', whenToUse: 'Saat pengguna meminta memindahkan elemen.', category: 'interaction', requiresPage: true },
  { name: 'draw_on_chart', label: 'Gambar chart', description: 'Menggambar garis atau bentuk pada chart.', whenToUse: 'Saat pengguna meminta anotasi chart.', category: 'interaction', requiresPage: true },
  { name: 'switch_timeframe', label: 'Ganti timeframe', description: 'Mengganti timeframe chart.', whenToUse: 'Saat pengguna meminta timeframe tertentu.', category: 'interaction', requiresPage: true },
  { name: 'fill_order_parameters', label: 'Isi parameter order', description: 'Mengisi parameter order trading.', whenToUse: 'Sebelum order setelah parameter jelas.', category: 'interaction', requiresPage: true },
  { name: 'execute_confirmed_order', label: 'Eksekusi order', description: 'Mengirim order yang telah dikonfirmasi.', whenToUse: 'Hanya setelah persetujuan eksplisit.', category: 'safety', requiresPage: true },
  { name: 'trigger_hotkey', label: 'Shortcut keyboard', description: 'Mengirim shortcut keyboard.', whenToUse: 'Saat pengguna meminta shortcut.', category: 'interaction', requiresPage: true },
  { name: 'trigger_keyboard_shortcut', label: 'Shortcut keyboard', description: 'Alias shortcut keyboard.', whenToUse: 'Saat pengguna meminta shortcut.', category: 'interaction', requiresPage: true },
  { name: 'inspect_canvas_layers', label: 'Canvas layers', description: 'Memeriksa layer canvas/SVG.', whenToUse: 'Saat halaman memakai canvas atau SVG.', category: 'vision', requiresPage: true },
  { name: 'wait_for_condition', label: 'Tunggu kondisi', description: 'Menunggu perubahan halaman.', whenToUse: 'Saat aksi membutuhkan halaman selesai memuat.', category: 'workflow', requiresPage: true },
  { name: 'request_confirmation', label: 'Konfirmasi aksi', description: 'Meminta persetujuan untuk aksi berisiko.', whenToUse: 'Sebelum aksi destruktif atau finansial.', category: 'safety', requiresPage: false },
  { name: 'request_user_confirmation', label: 'Konfirmasi pengguna', description: 'Alias konfirmasi pengguna.', whenToUse: 'Sebelum aksi berisiko.', category: 'safety', requiresPage: false },
  { name: 'request_trade_confirmation', label: 'Konfirmasi trade', description: 'Meminta konfirmasi transaksi.', whenToUse: 'Sebelum transaksi trading.', category: 'safety', requiresPage: false },
  { name: 'save_action_macro', label: 'Simpan macro', description: 'Menyimpan rangkaian aksi.', whenToUse: 'Saat pengguna meminta menyimpan workflow.', category: 'workflow', requiresPage: false },
  { name: 'finish_task', label: 'Selesaikan tugas', description: 'Menandai tugas selesai.', whenToUse: 'Sebagai penutup workflow multi-langkah.', category: 'workflow', requiresPage: false },
];

export function getAllToolNames(): Set<string> {
  const names = new Set<string>(TOOL_CATALOG.map((tool) => tool.name));
  for (const plugin of PluginRegistry.getToolPlugins()) {
    names.add(plugin.definition.name);
  }
  return names;
}

export const TOOL_NAMES = getAllToolNames();

export function formatToolCatalogForPrompt(): string {
  const baseTools = TOOL_CATALOG.map((tool, index) => `${index + 1}. ${tool.name}: ${tool.description} Gunakan saat: ${tool.whenToUse}`).join('\n');
  const pluginTools = PluginRegistry.formatToolPluginsForPrompt();
  return pluginTools ? `${baseTools}\n\nPLUGIN TOOLS (Auto-Discovered):\n${pluginTools}` : baseTools;
}

export function getNativeToolDefinitions(): NativeToolDefinition[] {
  const base = TOOL_CATALOG.filter((tool) => tool.name !== 'finish_task').map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: `${tool.description} ${tool.whenToUse}`,
      parameters: tool.parameters || defaultToolParameters(),
    },
  }));

  const plugins: NativeToolDefinition[] = PluginRegistry.getToolPlugins().map((p) => ({
    type: 'function' as const,
    function: {
      name: p.definition.name,
      description: p.definition.description,
      parameters: (p.definition.parameters as any) || { type: 'object', properties: {}, additionalProperties: true },
    },
  }));

  return [...base, ...plugins];
}

function defaultToolParameters(): NativeToolDefinition['function']['parameters'] {
  return {
    type: 'object',
    properties: {
      x: { type: 'number', description: 'Viewport X coordinate in pixels.' },
      y: { type: 'number', description: 'Viewport Y coordinate in pixels.' },
      startX: { type: 'number' }, startY: { type: 'number' },
      endX: { type: 'number' }, endY: { type: 'number' },
      selector: { type: 'string' }, text: { type: 'string' }, query: { type: 'string' },
      direction: { type: 'string', description: 'up or down' }, amount: { type: 'number' },
      keys: { type: 'array', description: 'Keyboard key names' }, wait_ms: { type: 'number' },
      details: { type: 'string' }, actionName: { type: 'string' }, timeframe: { type: 'string' },
      side: { type: 'string' }, lotSize: { type: 'string' }, sl: { type: 'string' }, tp: { type: 'string' },
      buttonSelector: { type: 'string' }, goalPattern: { type: 'string' }, actionSequence: { type: 'array' },
    },
    additionalProperties: true,
  };
}
