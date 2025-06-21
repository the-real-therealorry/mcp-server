import React, { useState, useEffect } from 'react';
import { Search, Download, RefreshCw, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../api';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
  source?: string;
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '100',
        ...(searchTerm && { search: searchTerm }),
        ...(levelFilter !== 'all' && { level: levelFilter }),
      });

      const response = await api.get(`/api/logs?${params}`);
      setLogs(response.data.logs);
    } catch (err) {
      setError('Failed to fetch logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [searchTerm, levelFilter]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, searchTerm, levelFilter]);

  const handleExportLogs = async () => {
    try {
      const response = await api.get('/api/logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `logs-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting logs:', err);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-destructive bg-destructive/10';
      case 'warn': return 'text-warning bg-warning/10';
      case 'info': return 'text-blue-500 bg-blue-500/10';
      case 'debug': return 'text-muted-foreground bg-muted';
      default: return 'text-foreground bg-muted';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return AlertCircle;
      case 'warn': return AlertTriangle;
      case 'info': return Info;
      case 'debug': return CheckCircle;
      default: return Info;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs</h1>
          <p className="mt-2 text-muted-foreground">
            Monitor system logs and activity
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>Auto Refresh</span>
          </button>
          
          <button
            onClick={handleExportLogs}
            className="flex items-center space-x-2 px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Levels</option>
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
      </div>

      {/* Logs Display */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="text-destructive">{error}</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {logs.map((log) => {
              const LevelIcon = getLevelIcon(log.level);
              return (
                <div key={log.id} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                      <LevelIcon className="h-3 w-3" />
                      <span className="uppercase">{log.level}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">
                          {log.message}
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {formatTimestamp(log.timestamp)}
                        </p>
                      </div>
                      
                      {log.source && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Source: {log.source}
                        </p>
                      )}
                      
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            Show metadata
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded-md overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;