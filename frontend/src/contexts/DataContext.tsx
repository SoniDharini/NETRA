import React, { createContext, useContext, useState, ReactNode } from 'react';

// ========= TYPES =========
export type FileStatus =
  | 'waiting'       // Initial state before any processing
  | 'hashing'       // Calculating file hash
  | 'uploading'     // Actively uploading chunks
  | 'parsing'       // Parsing file data (client or server)
  | 'processing'    // Generic server-side processing
  | 'completed'     // Successfully uploaded and processed
  | 'success'       // Kept for compatibility, maps to 'completed'
  | 'error';        // An error occurred at any stage

export interface PreviewData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
}

export interface UploadedFile {
  id: string;          // Unique UI identifier
  file?: File;
  name?: string;       // Fallback for file.name
  size?: number;       // Fallback for file.size
  status: FileStatus;
  progress: number;    // Overall progress (0-100)

  // Resumability & Integrity
  uploadId?: string;     // Unique identifier for the upload session
  fileHash?: string;     // SHA-256 hash of the file
  chunkCount?: number;   // Total number of chunks
  uploadedChunks?: number; // Number of chunks successfully uploaded

  // Data & State
  preview?: PreviewData;
  error?: string;
  worker?: Worker;
  fileId?: string;     // Final file ID from the backend
}

interface DataContextType {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  addFiles: (files: UploadedFile[]) => void;
  updateFile: (id: string, updates: Partial<UploadedFile>) => void;
  removeFile: (id: string) => void;
}

// ========= CONTEXT CREATION =========
const DataContext = createContext<DataContextType | undefined>(undefined);

// ========= PROVIDER COMPONENT =========
interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const addFiles = (newFiles: UploadedFile[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const updateFile = (id: string, updates: Partial<UploadedFile>) => {
    setFiles((prevFiles) =>
      prevFiles.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeFile = (id: string) => {
    setFiles((prevFiles) => {
      const fileToRemove = prevFiles.find(f => f.id === id);
      if (fileToRemove?.worker) {
        fileToRemove.worker.terminate();
      }
      return prevFiles.filter((f) => f.id !== id);
    });
  };

  const value = {
    files,
    setFiles,
    addFiles,
    updateFile,
    removeFile,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ========= CUSTOM HOOK =========
export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
