import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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


export interface UploadedFile {
  id: string;          // Unique UI identifier
  file?: File;         // Optional: removed during localStorage serialization
  status: FileStatus;
  progress: number;    // Overall progress (0-100)

  // Resumability & Integrity
  uploadId?: string;     // Unique identifier for the upload session
  fileHash?: string;     // SHA-256 hash of the file
  chunkCount?: number;   // Total number of chunks
  uploadedChunks?: number; // Number of chunks successfully uploaded

  // Data & State
  data?: { columns: string[]; rows: any[] };
  error?: string;
  worker?: Worker;
  fileId?: string;     // Final file ID from the backend
  fileName?: string;   // Store filename separately for display when file object is missing
}


interface DataContextType {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  addFiles: (files: UploadedFile[]) => void;
  updateFile: (id: string, updates: Partial<UploadedFile>) => void;
  removeFile: (id: string) => void;
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;
}

// ========= CONTEXT CREATION =========
const DataContext = createContext<DataContextType | undefined>(undefined);

// ========= PROVIDER COMPONENT =========
interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedFiles = localStorage.getItem('uploadedFiles');
      const storedActiveFileId = localStorage.getItem('activeFileId');
      if (storedFiles) {
        const parsedFiles = JSON.parse(storedFiles);
        // We can't store File objects in JSON, so they will be missing.
        // This is okay for files that are already uploaded.
        setFiles(parsedFiles);
      }
      if (storedActiveFileId) {
        setActiveFileId(JSON.parse(storedActiveFileId));
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
    }
  }, []);

  
  useEffect(() => {
    try {
      // Create a serializable version of the files array, excluding large/unserializable properties
      const serializableFiles = files.map(file => {
        const { file: fileObj, worker, data, ...rest } = file; // Exclude file, worker, and data
        return {
          ...rest,
          fileName: fileObj?.name || rest.fileName || 'unknown.csv' // Preserve filename
        };
      });
      localStorage.setItem('uploadedFiles', JSON.stringify(serializableFiles));
      localStorage.setItem('activeFileId', JSON.stringify(activeFileId));
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [files, activeFileId]);


  const addFiles = (newFiles: UploadedFile[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    if (newFiles.length > 0 && !activeFileId) {
      setActiveFileId(newFiles[0].id);
    }
  };

  const updateFile = (id: string, updates: Partial<UploadedFile>) => {
    setFiles((prevFiles) =>
      prevFiles.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeFile = (id: string) => {
    setFiles((prevFiles) => {
      const remainingFiles = prevFiles.filter((f) => f.id !== id);
      if (id === activeFileId) {
        setActiveFileId(remainingFiles.length > 0 ? remainingFiles[0].id : null);
      }
      return remainingFiles;
    });
  };

  const value = {
    files,
    setFiles,
    addFiles,
    updateFile,
    removeFile,
    activeFileId,
    setActiveFileId,
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