import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import { SnapshotOptions, SnapshotResult, ToolResult } from '../types';
import { logger } from '../../utils/logger';
import { contextManager } from './contextManager';

class SnapshotManager {
  private snapshotsDir = path.join(process.cwd(), 'data', 'snapshots');

  constructor() {
    // Ensure snapshots directory exists
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  async createSnapshot(args: SnapshotOptions = {}): Promise<ToolResult> {
    const startTime = Date.now();
    const {
      include_logs = true,
      include_context = true,
      include_files = false,
    } = args;

    try {
      const snapshotId = uuidv4();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotName = `snapshot-${timestamp}-${snapshotId.substring(0, 8)}`;
      const snapshotPath = path.join(this.snapshotsDir, `${snapshotName}.zip`);

      const zip = new AdmZip();
      const contents = {
        logs: 0,
        contexts: 0,
        files: 0,
      };

      // Add system information
      const systemInfo = {
        timestamp: new Date().toISOString(),
        snapshotId,
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        options: args,
      };

      zip.addFile('system-info.json', Buffer.from(JSON.stringify(systemInfo, null, 2)));

      // Include logs
      if (include_logs) {
        const logsDir = path.join(process.cwd(), 'logs');
        if (fs.existsSync(logsDir)) {
          const logFiles = fs.readdirSync(logsDir);
          for (const logFile of logFiles) {
            const logPath = path.join(logsDir, logFile);
            if (fs.statSync(logPath).isFile()) {
              zip.addLocalFile(logPath, 'logs/');
              contents.logs++;
            }
          }
        }
      }

      // Include context data
      if (include_context) {
        const contextData = contextManager.getContexts();
        zip.addFile('contexts.json', Buffer.from(JSON.stringify(contextData, null, 2)));
        contents.contexts = contextData.total;
      }

      // Include extracted files
      if (include_files) {
        const extractedDir = path.join(process.cwd(), 'data', 'extracted');
        if (fs.existsSync(extractedDir)) {
          this.addDirectoryToZip(zip, extractedDir, 'extracted/');
          contents.files = this.countFiles(extractedDir);
        }
      }

      // Write the snapshot
      zip.writeZip(snapshotPath);
      const stats = fs.statSync(snapshotPath);

      const result: SnapshotResult = {
        success: true,
        message: 'Snapshot created successfully',
        snapshotId,
        filePath: snapshotPath,
        size: stats.size,
        duration: Date.now() - startTime,
        contents,
      };

      logger.info('Snapshot created', {
        snapshotId,
        filePath: snapshotPath,
        size: stats.size,
        contents,
      });

      return {
        success: true,
        message: result.message,
        data: result,
        duration: result.duration,
      };
    } catch (error: any) {
      logger.error('Failed to create snapshot', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        message: `Failed to create snapshot: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private addDirectoryToZip(zip: AdmZip, dirPath: string, zipPath: string): void {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const itemZipPath = zipPath + item;
      
      if (fs.statSync(itemPath).isDirectory()) {
        this.addDirectoryToZip(zip, itemPath, itemZipPath + '/');
      } else {
        zip.addLocalFile(itemPath, zipPath);
      }
    }
  }

  private countFiles(dirPath: string): number {
    let count = 0;
    
    if (!fs.existsSync(dirPath)) {
      return count;
    }
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      
      if (fs.statSync(itemPath).isDirectory()) {
        count += this.countFiles(itemPath);
      } else {
        count++;
      }
    }
    
    return count;
  }

  getSnapshots(): Array<{
    id: string;
    name: string;
    created: string;
    size: number;
    path: string;
  }> {
    if (!fs.existsSync(this.snapshotsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.snapshotsDir);
    const snapshots = [];

    for (const file of files) {
      if (file.endsWith('.zip')) {
        const filePath = path.join(this.snapshotsDir, file);
        const stats = fs.statSync(filePath);
        
        snapshots.push({
          id: file.replace('.zip', ''),
          name: file,
          created: stats.birthtime.toISOString(),
          size: stats.size,
          path: filePath,
        });
      }
    }

    // Sort by creation date (newest first)
    snapshots.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return snapshots;
  }
}

export const snapshotManager = new SnapshotManager();