import { SuperAgentToolParams, ToolName, ToolResult } from '../../core/types/agent';

const SECRET_KEYS = /token|secret|password|api[_-]?key|authorization|base64|content/i;

export function sanitizeToolParameters(_toolName: ToolName, params: SuperAgentToolParams): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => {
    if (SECRET_KEYS.test(key)) return [key, '[disembunyikan]'];
    if (typeof value === 'string' && value.length > 500) return [key, `${value.slice(0, 120)}… [dipotong]`];
    return [key, value];
  }));
}

export function summarizeToolResult(result: ToolResult): string {
  if (!result.success) return result.error || 'Tool gagal dijalankan.';
  if (result.screenshotUrl) return 'Screenshot berhasil diambil.';
  if (Array.isArray(result.data)) return `${result.data.length} item ditemukan.`;
  if (result.data && typeof result.data === 'object') return `${Object.keys(result.data).length} bagian data diterima.`;
  return 'Berhasil dijalankan.';
}
