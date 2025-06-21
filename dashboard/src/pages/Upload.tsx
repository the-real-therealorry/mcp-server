import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../api';

interface UploadResult {
  success: boolean;
  message: string;
  extractedFiles?: string[];
  contextId?: string;
}

const Upload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file.name.endsWith('.zip')) {
      setError('Only ZIP files are allowed');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/mcp/tools/load-zip', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          }
        },
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload</h1>
        <p className="mt-2 text-muted-foreground">
          Upload and extract ZIP files for processing
        </p>
      </div>

      <div className="max-w-2xl">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground hover:border-primary hover:bg-accent'
          }`}
        >
          <input {...getInputProps()} />
          <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              {isDragActive
                ? 'Drop the ZIP file here'
                : 'Drag & drop a ZIP file here, or click to select'}
            </p>
            <p className="text-sm text-muted-foreground">
              Maximum file size: 50MB
            </p>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-6 space-y-4 animate-slide-in">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="text-sm font-medium text-foreground">
                Uploading and processing...
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 rounded-md bg-destructive/10 p-4 animate-slide-in">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">Upload Failed</h3>
                <p className="mt-1 text-sm text-destructive">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Result */}
        {result && result.success && (
          <div className="mt-6 rounded-md bg-success/10 p-4 animate-bounce-in">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-success" />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-success">Upload Successful</h3>
                <p className="mt-1 text-sm text-success">{result.message}</p>
                
                {result.extractedFiles && result.extractedFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      Extracted Files ({result.extractedFiles.length}):
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.extractedFiles.map((file, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.contextId && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Context ID:</span> {result.contextId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Guidelines */}
        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Upload Guidelines</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Only ZIP files are accepted</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Maximum file size: 50MB</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Supported file types: .js, .ts, .json, .md, .txt, .yml, .yaml</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Files are automatically scanned for security threats</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>Extracted files are stored securely and isolated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;