export interface ServerConfig {
  port: number;
  corsOrigin: string;
  maxFileSize: number;
  logLevel: string;
  nodeEnv: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemStats {
  uptime: number;
  totalFiles: number;
  totalContexts: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  diskUsage: {
    used: number;
    total: number;
  };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'upload' | 'extraction' | 'context' | 'error';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
  source?: string;
}