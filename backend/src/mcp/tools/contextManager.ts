import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ContextItem, ToolResult } from '../types';
import { logger } from '../../utils/logger';

class ContextManager {
  private contextsFile = path.join(process.cwd(), 'data', 'contexts.json');
  private contexts: Map<string, ContextItem> = new Map();

  constructor() {
    this.loadContexts();
  }

  async markApproved(args: {
    context_id: string;
    approved: boolean;
    reason?: string;
  }): Promise<ToolResult> {
    const startTime = Date.now();
    const { context_id, approved, reason } = args;

    try {
      const context = this.contexts.get(context_id);
      if (!context) {
        return {
          success: false,
          message: `Context not found: ${context_id}`,
          duration: Date.now() - startTime,
        };
      }

      // Update context status
      context.status = approved ? 'approved' : 'rejected';
      context.updated = new Date().toISOString();
      
      if (reason) {
        context.metadata = {
          ...context.metadata,
          approvalReason: reason,
        };
      }

      this.contexts.set(context_id, context);
      this.saveContexts();

      logger.info(`Context ${approved ? 'approved' : 'rejected'}`, {
        contextId: context_id,
        reason,
      });

      return {
        success: true,
        message: `Context ${approved ? 'approved' : 'rejected'} successfully`,
        data: { context },
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error('Failed to update context approval', {
        contextId: context_id,
        error: error.message,
      });

      return {
        success: false,
        message: `Failed to update context: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  createContext(name: string, type: 'zip' | 'file' | 'directory', size: number, fileCount?: number): string {
    const context: ContextItem = {
      id: uuidv4(),
      name,
      type,
      status: 'pending',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      size,
      fileCount,
    };

    this.contexts.set(context.id, context);
    this.saveContexts();

    logger.info('Context created', {
      contextId: context.id,
      name,
      type,
      size,
    });

    return context.id;
  }

  getContext(contextId: string): ContextItem | undefined {
    return this.contexts.get(contextId);
  }

  getContexts(filter?: {
    status?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): { items: ContextItem[]; total: number } {
    let filteredContexts = Array.from(this.contexts.values());

    if (filter?.status && filter.status !== 'all') {
      filteredContexts = filteredContexts.filter(c => c.status === filter.status);
    }

    if (filter?.type && filter.type !== 'all') {
      filteredContexts = filteredContexts.filter(c => c.type === filter.type);
    }

    if (filter?.search) {
      const searchTerm = filter.search.toLowerCase();
      filteredContexts = filteredContexts.filter(c => 
        c.name.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by created date (newest first)
    filteredContexts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    const total = filteredContexts.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 20;

    const items = filteredContexts.slice(offset, offset + limit);

    return { items, total };
  }

  private loadContexts(): void {
    try {
      if (fs.existsSync(this.contextsFile)) {
        const data = fs.readFileSync(this.contextsFile, 'utf8');
        const contextsArray = JSON.parse(data);
        this.contexts = new Map(contextsArray.map((c: ContextItem) => [c.id, c]));
      }
    } catch (error: any) {
      logger.error('Failed to load contexts', { error: error.message });
    }
  }

  private saveContexts(): void {
    try {
      const contextsArray = Array.from(this.contexts.values());
      fs.writeFileSync(this.contextsFile, JSON.stringify(contextsArray, null, 2));
    } catch (error: any) {
      logger.error('Failed to save contexts', { error: error.message });
    }
  }
}

export const contextManager = new ContextManager();