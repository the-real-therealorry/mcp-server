import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import sanitize from 'sanitize-filename';
import { ExtractOptions, ExtractResult, ToolResult } from '../types';
import { logger } from '../../utils/logger';
import { SecurityValidator } from '../../utils/security';

class ZipHandler {
  private readonly maxExtractedSize = 100 * 1024 * 1024; // 100MB
  private readonly maxFiles = 1000;
  private readonly allowedExtensions = ['.js', '.ts', '.json', '.md', '.txt', '.yml', '.yaml', '.csv', '.xml'];
  private readonly securityValidator = new SecurityValidator();

  async extractZip(args: {
    file_path: string;
    extract_to?: string;
    options?: ExtractOptions;
  }): Promise<ToolResult> {
    const startTime = Date.now();
    const { file_path, extract_to = 'extracted', options = {} } = args;

    try {
      // Validate file path
      if (!fs.existsSync(file_path)) {
        return {
          success: false,
          message: `File not found: ${file_path}`,
          duration: Date.now() - startTime,
        };
      }

      // Security validation
      const securityResult = await this.securityValidator.validateFile(file_path);
      if (!securityResult.isValid) {
        logger.warn('Security validation failed for ZIP file', {
          filePath: file_path,
          reason: securityResult.reason,
        });
        return {
          success: false,
          message: `Security validation failed: ${securityResult.reason}`,
          duration: Date.now() - startTime,
        };
      }

      // Extract ZIP file
      const extractResult = await this.performExtraction(file_path, extract_to, options);
      
      logger.info('ZIP extraction completed', {
        filePath: file_path,
        extractedFiles: extractResult.extractedFiles.length,
        totalSize: extractResult.totalSize,
        duration: extractResult.duration,
      });

      return {
        success: extractResult.success,
        message: extractResult.message,
        data: extractResult,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error('ZIP extraction failed', {
        filePath: file_path,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        message: `Extraction failed: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private async performExtraction(
    zipPath: string,
    extractTo: string,
    options: ExtractOptions
  ): Promise<ExtractResult> {
    const startTime = Date.now();
    const extractedFiles: string[] = [];
    const warnings: string[] = [];
    let totalSize = 0;

    // Create extraction directory
    const extractPath = path.resolve(process.cwd(), 'data', extractTo);
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    // Load ZIP file
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    // Validate ZIP contents
    const validationResult = this.validateZipContents(entries);
    if (!validationResult.isValid) {
      throw new Error(validationResult.reason);
    }

    // Extract files
    for (const entry of entries) {
      if (entry.isDirectory) {
        continue; // Skip directories
      }

      // Validate entry
      const entryValidation = this.validateZipEntry(entry);
      if (!entryValidation.isValid) {
        warnings.push(`Skipped ${entry.entryName}: ${entryValidation.reason}`);
        continue;
      }

      // Sanitize file path
      const sanitizedPath = this.sanitizeFilePath(entry.entryName);
      const outputPath = path.join(extractPath, sanitizedPath);

      // Check if file already exists
      if (fs.existsSync(outputPath) && !options.overwrite) {
        warnings.push(`Skipped ${entry.entryName}: File already exists`);
        continue;
      }

      // Create directory structure
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Extract file
      try {
        const data = entry.getData();
        fs.writeFileSync(outputPath, data);
        
        extractedFiles.push(sanitizedPath);
        totalSize += data.length;
        
        // Check total size limit
        if (totalSize > this.maxExtractedSize) {
          throw new Error(`Total extracted size exceeds limit (${this.maxExtractedSize} bytes)`);
        }
      } catch (error: any) {
        warnings.push(`Failed to extract ${entry.entryName}: ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Successfully extracted ${extractedFiles.length} files`,
      extractedFiles,
      totalFiles: entries.length,
      totalSize,
      duration: Date.now() - startTime,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private validateZipContents(entries: AdmZip.IZipEntry[]): { isValid: boolean; reason?: string } {
    if (entries.length === 0) {
      return { isValid: false, reason: 'ZIP file is empty' };
    }

    if (entries.length > this.maxFiles) {
      return { isValid: false, reason: `ZIP contains too many files (max: ${this.maxFiles})` };
    }

    // Check for zip bombs
    let totalUncompressedSize = 0;
    let totalCompressedSize = 0;

    for (const entry of entries) {
      if (!entry.isDirectory) {
        totalUncompressedSize += entry.header.size;
        totalCompressedSize += entry.header.compressedSize;
      }
    }

    // Compression ratio check (potential zip bomb)
    const compressionRatio = totalUncompressedSize / totalCompressedSize;
    if (compressionRatio > 100) {
      return { isValid: false, reason: 'Suspicious compression ratio (possible zip bomb)' };
    }

    if (totalUncompressedSize > this.maxExtractedSize) {
      return { isValid: false, reason: `Total uncompressed size exceeds limit (${this.maxExtractedSize} bytes)` };
    }

    return { isValid: true };
  }

  private validateZipEntry(entry: AdmZip.IZipEntry): { isValid: boolean; reason?: string } {
    const entryName = entry.entryName;

    // Check for path traversal
    if (entryName.includes('..') || entryName.includes('\\') || entryName.startsWith('/')) {
      return { isValid: false, reason: 'Path traversal attempt detected' };
    }

    // Check file extension
    const ext = path.extname(entryName).toLowerCase();
    if (ext && !this.allowedExtensions.includes(ext)) {
      return { isValid: false, reason: `File type not allowed: ${ext}` };
    }

    // Check file size
    if (entry.header.size > 10 * 1024 * 1024) { // 10MB per file
      return { isValid: false, reason: 'File too large' };
    }

    return { isValid: true };
  }

  private sanitizeFilePath(filePath: string): string {
    // Split path into components and sanitize each
    const components = filePath.split('/').map(component => {
      return sanitize(component, { replacement: '_' });
    });

    // Remove empty components and ensure no path traversal
    const sanitized = components
      .filter(component => component && component !== '.' && component !== '..')
      .join('/');

    return sanitized || 'sanitized_file';
  }
}

export const zipHandler = new ZipHandler();