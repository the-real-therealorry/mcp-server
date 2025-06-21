import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zipHandler } from './tools/zipHandler';
import { contextManager } from './tools/contextManager';
import { snapshotManager } from './tools/snapshotManager';
import { logger } from '../utils/logger';
import { MCPTool, ToolResult } from './types';

class MCPServer {
  private server: Server;
  private tools: Map<string, MCPTool> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.initializeTools();
    this.setupHandlers();
  }

  private initializeTools() {
    const tools: MCPTool[] = [
      {
        name: 'load_zip',
        description: 'Securely extract and process ZIP archives',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the ZIP file to extract',
            },
            extract_to: {
              type: 'string',
              description: 'Directory to extract files to',
              default: 'extracted',
            },
            options: {
              type: 'object',
              properties: {
                overwrite: {
                  type: 'boolean',
                  description: 'Whether to overwrite existing files',
                  default: false,
                },
                preserve_structure: {
                  type: 'boolean',
                  description: 'Whether to preserve directory structure',
                  default: true,
                },
              },
            },
          },
          required: ['file_path'],
        },
        handler: zipHandler.extractZip.bind(zipHandler),
      },
      {
        name: 'mark_approved',
        description: 'Mark context as approved for processing',
        inputSchema: {
          type: 'object',
          properties: {
            context_id: {
              type: 'string',
              description: 'ID of the context to approve',
            },
            approved: {
              type: 'boolean',
              description: 'Whether to approve or reject the context',
            },
            reason: {
              type: 'string',
              description: 'Optional reason for approval/rejection',
            },
          },
          required: ['context_id', 'approved'],
        },
        handler: contextManager.markApproved.bind(contextManager),
      },
      {
        name: 'snapshot',
        description: 'Create system state snapshot',
        inputSchema: {
          type: 'object',
          properties: {
            include_logs: {
              type: 'boolean',
              description: 'Whether to include logs in the snapshot',
              default: true,
            },
            include_context: {
              type: 'boolean',
              description: 'Whether to include context data in the snapshot',
              default: true,
            },
            include_files: {
              type: 'boolean',
              description: 'Whether to include extracted files in the snapshot',
              default: false,
            },
          },
        },
        handler: snapshotManager.createSnapshot.bind(snapshotManager),
      },
    ];

    tools.forEach((tool) => {
      this.tools.set(tool.name, tool);
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info(`MCP tool called: ${name}`, { arguments: args });

      const tool = this.tools.get(name);
      if (!tool) {
        const error = `Unknown tool: ${name}`;
        logger.error(error);
        return {
          content: [
            {
              type: 'text',
              text: error,
            },
          ],
          isError: true,
        };
      }

      try {
        const result: ToolResult = await tool.handler(args);
        
        logger.info(`MCP tool completed: ${name}`, { 
          success: result.success,
          duration: result.duration,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        logger.error(`MCP tool failed: ${name}`, { 
          error: error.message,
          stack: error.stack,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Server started successfully');
  }

  getTools() {
    return Array.from(this.tools.values());
  }

  getToolUsage(_toolName: string) {
    // This would be implemented with actual usage tracking
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      lastUsed: null,
    };
  }
}

export const mcpServer = new MCPServer();