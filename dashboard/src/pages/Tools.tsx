import React, { useState, useEffect } from 'react';
import { Settings, Play, Square, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../api';

interface MCPTool {
  name: string;
  description: string;
  enabled: boolean;
  lastUsed?: string;
  usage: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
  };
}

const Tools: React.FC = () => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/mcp/tools');
      setTools(response.data.tools);
    } catch (err) {
      setError('Failed to fetch MCP tools');
      console.error('Error fetching tools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const toggleTool = async (toolName: string, enabled: boolean) => {
    try {
      await api.post('/api/mcp/tools/toggle', {
        tool: toolName,
        enabled,
      });
      fetchTools(); // Refresh the list
    } catch (err) {
      console.error('Error toggling tool:', err);
    }
  };

  const testTool = async (toolName: string) => {
    try {
      await api.post('/api/mcp/tools/test', { tool: toolName });
      fetchTools(); // Refresh to show updated usage stats
    } catch (err) {
      console.error('Error testing tool:', err);
    }
  };

  const getSuccessRate = (usage: MCPTool['usage']) => {
    if (usage.totalCalls === 0) return 0;
    return Math.round((usage.successfulCalls / usage.totalCalls) * 100);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">MCP Tools</h1>
          <p className="mt-2 text-muted-foreground">
            Manage and monitor Model Context Protocol tools
          </p>
        </div>
        
        <button
          onClick={fetchTools}
          className="flex items-center space-x-2 px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="col-span-full rounded-md bg-destructive/10 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">Error</h3>
                <p className="mt-1 text-sm text-destructive">{error}</p>
              </div>
            </div>
          </div>
        ) : tools.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No MCP tools available</p>
          </div>
        ) : (
          tools.map((tool) => (
            <div key={tool.name} className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${tool.enabled ? 'bg-success/10' : 'bg-muted'}`}>
                    <Settings className={`h-5 w-5 ${tool.enabled ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleTool(tool.name, !tool.enabled)}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      tool.enabled
                        ? 'bg-success/10 text-success hover:bg-success/20'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {tool.enabled ? <CheckCircle className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    <span>{tool.enabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                  
                  {tool.enabled && (
                    <button
                      onClick={() => testTool(tool.name)}
                      className="flex items-center space-x-1 px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/80 rounded-md text-sm font-medium transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      <span>Test</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Usage Statistics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Calls</span>
                  <span className="font-medium text-foreground">{tool.usage.totalCalls}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span className={`font-medium ${getSuccessRate(tool.usage) >= 90 ? 'text-success' : getSuccessRate(tool.usage) >= 70 ? 'text-warning' : 'text-destructive'}`}>
                    {getSuccessRate(tool.usage)}%
                  </span>
                </div>
                
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      getSuccessRate(tool.usage) >= 90 ? 'bg-success' : 
                      getSuccessRate(tool.usage) >= 70 ? 'bg-warning' : 'bg-destructive'
                    }`}
                    style={{ width: `${getSuccessRate(tool.usage)}%` }}
                  />
                </div>
                
                {tool.lastUsed && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Used</span>
                    <span className="text-foreground">
                      {new Date(tool.lastUsed).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MCP Information */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">About MCP Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-2">load_zip</h4>
            <p className="text-muted-foreground">
              Securely extracts and processes ZIP archives with built-in security validation and file type filtering.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">mark_approved</h4>
            <p className="text-muted-foreground">
              Manages context approval workflow, allowing administrators to approve or reject uploaded content.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">snapshot</h4>
            <p className="text-muted-foreground">
              Creates comprehensive system state snapshots including logs, contexts, and configuration data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tools;