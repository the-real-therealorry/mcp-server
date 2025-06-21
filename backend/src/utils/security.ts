import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';
import path from 'path';
import { logger } from './logger';

export interface SecurityValidationResult {
  isValid: boolean;
  reason?: string;
  details?: Record<string, any>;
}

export class SecurityValidator {
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedMimeTypes = ['application/zip', 'application/x-zip-compressed'];
  private readonly dangerousPatterns = [
    /\.\./,
    /^\/+/,
    /\\+/,
    /\0/,
    /<script/i,
    /javascript:/i,
  ];

  async validateFile(filePath: string): Promise<SecurityValidationResult> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          isValid: false,
          reason: 'File does not exist',
        };
      }

      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxFileSize) {
        return {
          isValid: false,
          reason: `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
          details: { actualSize: stats.size, maxSize: this.maxFileSize },
        };
      }

      // Check file type
      const buffer = fs.readFileSync(filePath);
      const fileType = await fileTypeFromBuffer(buffer);
      
      if (!fileType || !this.allowedMimeTypes.includes(fileType.mime)) {
        return {
          isValid: false,
          reason: 'Invalid file type',
          details: { detectedType: fileType?.mime, allowedTypes: this.allowedMimeTypes },
        };
      }

      // Check for dangerous patterns in filename
      const fileName = path.basename(filePath);
      for (const pattern of this.dangerousPatterns) {
        if (pattern.test(fileName)) {
          return {
            isValid: false,
            reason: 'Filename contains dangerous patterns',
            details: { pattern: pattern.source },
          };
        }
      }

      return { isValid: true };
    } catch (error: any) {
      logger.error('Security validation failed', {
        filePath,
        error: error.message,
      });

      return {
        isValid: false,
        reason: 'Security validation failed',
        details: { error: error.message },
      };
    }
  }

  sanitizePath(inputPath: string): string {
    // Remove dangerous characters and patterns
    let sanitized = inputPath
      .replace(/\.\./g, '')
      .replace(/^\/+/, '')
      .replace(/\\+/g, '/')
      .replace(/\0/g, '')
      .replace(/[<>:"|?*]/g, '_');

    // Normalize path separators
    sanitized = path.normalize(sanitized);

    // Ensure path doesn't start with /
    if (sanitized.startsWith('/')) {
      sanitized = sanitized.substring(1);
    }

    return sanitized || 'sanitized';
  }

  validateZipEntry(entryName: string, size: number): SecurityValidationResult {
    // Check for path traversal
    if (entryName.includes('..') || entryName.startsWith('/')) {
      return {
        isValid: false,
        reason: 'Path traversal attempt detected',
        details: { entryName },
      };
    }

    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(entryName)) {
        return {
          isValid: false,
          reason: 'Entry name contains dangerous patterns',
          details: { entryName, pattern: pattern.source },
        };
      }
    }

    // Check entry size
    if (size > 10 * 1024 * 1024) { // 10MB per entry
      return {
        isValid: false,
        reason: 'Entry size too large',
        details: { size, maxSize: 10 * 1024 * 1024 },
      };
    }

    return { isValid: true };
  }
}