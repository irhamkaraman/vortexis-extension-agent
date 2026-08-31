export interface ToolConnection {
  id: string;
  name: string;
  description: string;
  type: 'MCP' | 'REST_API' | 'INTERNAL';
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  config?: any;
}
