export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ExtractOptions {
  overwrite?: boolean;
  preserve_structure?: boolean;
  max_files?: number;
  max_size?: number;
}

export interface ExtractResult {
  success: boolean;
  message: string;
  extractedFiles: string[];
  totalFiles: number;
  totalSize: number;
  duration: number;
  warnings?: string[];
}

export interface ContextItem {
  id: string;
  name: string;
  type: 'zip' | 'file' | 'directory';
  status: 'pending' | 'approved' | 'rejected';
  created: string;
  updated: string;
  size: number;
  fileCount?: number;
  metadata?: Record<string, any>;
}

export interface SnapshotOptions {
  include_logs?: boolean;
  include_context?: boolean;
  include_files?: boolean;
}

export interface SnapshotResult {
  success: boolean;
  message: string;
  snapshotId: string;
  filePath: string;
  size: number;
  duration: number;
  contents: {
    logs?: number;
    contexts?: number;
    files?: number;
  };
}