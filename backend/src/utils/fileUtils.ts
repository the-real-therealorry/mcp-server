
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export class FileUtils {
  static ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Created directory: ${dirPath}`);
    }
  }

  static deleteFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted file: ${filePath}`);
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error(`Failed to delete file: ${filePath}`, { error: error.message });
      return false;
    }
  }

  static deleteDirectory(dirPath: string): boolean {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        logger.info(`Deleted directory: ${dirPath}`);
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error(`Failed to delete directory: ${dirPath}`, { error: error.message });
      return false;
    }
  }

  static getDirectorySize(dirPath: string): number {
    let totalSize = 0;

    if (!fs.existsSync(dirPath)) {
      return totalSize;
    }

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        totalSize += this.getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  static countFiles(dirPath: string): number {
    let count = 0;

    if (!fs.existsSync(dirPath)) {
      return count;
    }

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        count += this.countFiles(itemPath);
      } else {
        count++;
      }
    }

    return count;
  }

  static formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  static isValidFileName(fileName: string): boolean {
    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(fileName)) {
      return false;
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(fileName)) {
      return false;
    }

    // Check length
    if (fileName.length === 0 || fileName.length > 255) {
      return false;
    }

    return true;
  }
}