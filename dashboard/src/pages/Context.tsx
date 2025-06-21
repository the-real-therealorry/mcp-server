import React, { useState, useEffect } from 'react';
import { Search, FileText, Calendar, CheckCircle, Clock } from 'lucide-react';
import { api } from '../api';

interface ContextItem {
  id: string;
  name: string;
  type: 'zip' | 'file' | 'directory';
  status: 'pending' | 'approved' | 'rejected';
  created: string;
  updated: string;
  size: number;
  fileCount?: number;
}

const Context: React.FC = () => {
  const [contexts, setContexts] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchContexts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
      });

      const response = await api.get(`/api/context?${params}`);
      setContexts(response.data.items);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError('Failed to fetch contexts');
      console.error('Error fetching contexts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContexts();
  }, [currentPage, searchTerm, statusFilter, typeFilter]);

  const handleApproval = async (contextId: string, approved: boolean) => {
    try {
      await api.post('/api/mcp/tools/mark-approved', {
        context_id: contextId,
        approved,
      });
      fetchContexts(); // Refresh the list
    } catch (err) {
      console.error('Error updating context approval:', err);
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-success bg-success/10';
      case 'rejected': return 'text-destructive bg-destructive/10';
      default: return 'text-warning bg-warning/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return CheckCircle;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Context</h1>
        <p className="mt-2 text-muted-foreground">
          Manage and approve uploaded contexts
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contexts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Types</option>
          <option value="zip">ZIP Files</option>
          <option value="file">Files</option>
          <option value="directory">Directories</option>
        </select>
      </div>

      {/* Context List */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="text-destructive">{error}</div>
          </div>
        ) : contexts.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No contexts found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contexts.map((context) => {
              const StatusIcon = getStatusIcon(context.status);
              return (
                <div key={context.id} className="p-6 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {context.name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                          <span className="capitalize">{context.type}</span>
                          <span>{formatBytes(context.size)}</span>
                          {context.fileCount && (
                            <span>{context.fileCount} files</span>
                          )}
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(context.created).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(context.status)}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="capitalize">{context.status}</span>
                      </div>

                      {context.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproval(context.id, true)}
                            className="px-3 py-1 text-sm font-medium text-success hover:bg-success/10 rounded-md transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproval(context.id, false)}
                            className="px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Context;