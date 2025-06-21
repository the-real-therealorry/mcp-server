import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { zipHandler } from '../mcp/tools/zipHandler';
import { contextManager } from '../mcp/tools/contextManager';
import { snapshotManager } from '../mcp/tools/snapshotManager';
import { mcpServer } from '../mcp/mcpServer';
import { logger } from '../utils/logger';
import { validateZipUpload, validateContextQuery } from './validation';

const router = express.Router();

// Rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 uploads per window
  message: 'Too many uploads, try again later',
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

// Apply rate limiting
router.use(apiLimiter);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'data', 'zips');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${sanitizedName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
});

// MCP Tools endpoints
router.post('/mcp/tools/load-zip', uploadLimiter, upload.single('file'), validateZipUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const result = await zipHandler.extractZip({
      file_path: req.file.path,
      extract_to: req.body.extract_to || 'extracted',
      options: {
        overwrite: req.body.overwrite === 'true',
        preserve_structure: req.body.preserve_structure !== 'false',
      },
    });

    if (result.success && result.data) {
      // Create context entry
      const contextId = contextManager.createContext(
        req.file.originalname,
        'zip',
        req.file.size,
        result.data.extractedFiles.length
      );

      return res.json({
        ...result,
        contextId,
      });
    } else {
      return res.status(400).json(result);
    }
  } catch (error: any) {
    logger.error('ZIP upload failed', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/mcp/tools/mark-approved', async (req, res) => {
  try {
    const result = await contextManager.markApproved(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error('Context approval failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/mcp/tools/snapshot', async (req, res) => {
  try {
    const result = await snapshotManager.createSnapshot(req.body);
    res.json(result);
  } catch (error: any) {
    logger.error('Snapshot creation failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Context management
router.get('/context', validateContextQuery, (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, search } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    const result = contextManager.getContexts({
      status: status as string,
      type: type as string,
      search: search as string,
      limit: Number(limit),
      offset,
    });

    const totalPages = Math.ceil(result.total / Number(limit));

    res.json({
      items: result.items,
      total: result.total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
    });
  } catch (error: any) {
    logger.error('Context query failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// MCP Tools management
router.get('/mcp/tools', (_req, res) => {
  try {
    const tools = mcpServer.getTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      enabled: true, // All tools are enabled by default
      usage: mcpServer.getToolUsage(tool.name),
    }));

    res.json({ tools });
  } catch (error: any) {
    logger.error('Tools query failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// System statistics
router.get('/stats', (_req, res) => {
  try {
    const contexts = contextManager.getContexts();
    const stats = {
      uptime: process.uptime(),
      totalFiles: 0, // Would be calculated from actual file system
      totalContexts: contexts.total,
      activeConnections: 1, // Placeholder
      memoryUsage: process.memoryUsage(),
      diskUsage: {
        used: 0, // Would be calculated from actual disk usage
        total: 1024 * 1024 * 1024, // 1GB placeholder
      },
      recentActivity: [], // Would be fetched from activity log
    };

    res.json(stats);
  } catch (error: any) {
    logger.error('Stats query failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Logs endpoint
router.get('/logs', (_req, res) => {
  try {
    const { limit: _limit = 100, level: _level, search: _search } = _req.query;
    
    // This would be implemented with actual log storage/retrieval
    const logs = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Server started successfully',
        source: 'server',
      },
    ];

    res.json({ logs });
  } catch (error: any) {
    logger.error('Logs query failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

export { router as apiRoutes };